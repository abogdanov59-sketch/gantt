package com.example.platform.kms

import com.example.platform.common.ApiError
import com.example.platform.crypto.EnvelopeCipher
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.plugins.callloging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import io.ktor.server.util.getOrFail
import kotlinx.datetime.Clock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

private val logger = LoggerFactory.getLogger("kms-service")

fun Application.module() {
    val service = KmsService()

    install(CallLogging)
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true; prettyPrint = true })
    }
    install(StatusPages) {
        exception<IllegalArgumentException> { call, cause ->
            logger.warn("Validation error", cause)
            call.respond(HttpStatusCode.BadRequest, ApiError(code = "validation_error", message = cause.message ?: "invalid request"))
        }
        exception<NoSuchElementException> { call, cause ->
            logger.warn("Not found", cause)
            call.respond(HttpStatusCode.NotFound, ApiError(code = "not_found", message = cause.message ?: "not found"))
        }
        exception<Throwable> { call, cause ->
            logger.error("Unexpected error", cause)
            call.respond(HttpStatusCode.InternalServerError, ApiError(code = "internal_error", message = "unexpected error"))
        }
    }

    routing {
        kmsRoutes(service)
    }
}

private fun Route.kmsRoutes(service: KmsService) {
    post("/keys/tenants/{tenantId}/tmk") {
        val tenantId = call.parameters.getOrFail("tenantId")
        val request = call.receive<CreateTmkRequest>()
        val response = service.issueTenantKey(tenantId, request)
        call.respond(HttpStatusCode.Created, response)
    }

    post("/keys/wrap-dek") {
        val request = call.receive<WrapDekRequest>()
        val response = service.wrapDek(request)
        call.respond(response)
    }

    post("/keys/unwrap-dek") {
        val request = call.receive<UnwrapDekRequest>()
        val response = service.unwrapDek(request)
        call.respond(response)
    }

    post("/keys/rotate/tmk") {
        val request = call.receive<RotateTmkRequest>()
        val response = service.rotateTenantKey(request)
        call.respond(response)
    }

    post("/keys/invalidate/tmk") {
        val request = call.receive<InvalidateTmkRequest>()
        service.invalidateTenantKey(request)
        call.respond(HttpStatusCode.Accepted, mapOf("status" to "updated"))
    }

    post("/keys/derive/ssk") {
        val request = call.receive<DeriveSskRequest>()
        val response = service.deriveSsk(request)
        call.respond(response)
    }

    get("/keys/{tmkId}/metadata") {
        val tmkId = call.parameters.getOrFail("tmkId")
        val response = service.getMetadata(tmkId)
        call.respond(response)
    }
}

class KmsService(
    private val cipher: EnvelopeCipher = EnvelopeCipher()
) {
    private val rootKey: SecretKey
    private val tenantKeys = ConcurrentHashMap<String, MutableList<TenantMasterKey>>()

    init {
        val generator = KeyGenerator.getInstance("AES")
        generator.init(256)
        rootKey = generator.generateKey()
    }

    fun issueTenantKey(tenantId: String, request: CreateTmkRequest): TenantKeyResponse {
        val tmk = cipher.generateDek()
        val wrapped = cipher.wrapWithAesKw(rootKey, tmk)
        val version = (tenantKeys[tenantId]?.maxOfOrNull { it.version } ?: 0) + 1
        val record = TenantMasterKey(
            tmkId = request.tmkId ?: UUID.randomUUID().toString(),
            version = version,
            status = KeyStatus.ACTIVE,
            wrappedKey = wrapped,
            createdAt = Clock.System.now(),
            updatedAt = Clock.System.now()
        )
        tenantKeys.computeIfAbsent(tenantId) { mutableListOf() }.add(record)
        return TenantKeyResponse(
            tenantId = tenantId,
            tmkId = record.tmkId,
            version = record.version,
            status = record.status,
            wrappedKey = record.wrappedKey.encode()
        )
    }

    fun wrapDek(request: WrapDekRequest): WrappedDekResponse {
        val tmk = resolveActiveKey(request.tenantId, request.tmkId)
        val dek = SecretKeySpec(request.dek.decode(), "AES")
        val wrapped = cipher.wrapWithAesKw(tmk.secretKey, dek)
        return WrappedDekResponse(wrappedDek = wrapped.encode(), tmkId = tmk.record.tmkId)
    }

    fun unwrapDek(request: UnwrapDekRequest): UnwrappedDekResponse {
        val tmk = resolveActiveKey(request.tenantId, request.tmkId)
        val dek = cipher.unwrapWithAesKw(tmk.secretKey, request.wrappedDek.decode())
        return UnwrappedDekResponse(dek = dek.encoded.encode(), algorithm = "AES-256")
    }

    fun rotateTenantKey(request: RotateTmkRequest): TenantKeyResponse {
        val existing = resolveActiveKey(request.tenantId, request.tmkId)
        existing.record.status = KeyStatus.PENDING_ROTATION
        val issued = issueTenantKey(request.tenantId, CreateTmkRequest(tmkId = existing.record.tmkId, metadata = request.metadata))
        return issued
    }

    fun invalidateTenantKey(request: InvalidateTmkRequest) {
        val key = resolveActiveKey(request.tenantId, request.tmkId)
        key.record.status = request.status
        key.record.updatedAt = Clock.System.now()
    }

    fun deriveSsk(request: DeriveSskRequest): DeriveSskResponse {
        val key = resolveActiveKey(request.tenantId, request.tmkId)
        val ssk = cipher.deriveSsk(
            tmkMaterial = key.secretKey.encoded,
            nonce = request.sessionNonce.decode(),
            tenantId = request.tenantId
        )
        return DeriveSskResponse(ssk = ssk.encode(), algorithm = "HKDF-SHA256")
    }

    fun getMetadata(tmkId: String): TenantKeyMetadata {
        val record = tenantKeys.values.flatten().find { it.tmkId == tmkId }
            ?: throw NoSuchElementException("tmk $tmkId not found")
        return record.toMetadata()
    }

    private fun resolveActiveKey(tenantId: String, tmkId: String?): ResolvedKey {
        val keys = tenantKeys[tenantId] ?: throw NoSuchElementException("tenant $tenantId not found")
        val key = if (tmkId == null) keys.maxByOrNull { it.version } else keys.find { it.tmkId == tmkId }
            ?: throw NoSuchElementException("tmk $tmkId not found for tenant $tenantId")
        if (key.status != KeyStatus.ACTIVE && key.status != KeyStatus.PENDING_ROTATION) {
            throw IllegalArgumentException("tmk ${key.tmkId} is not active")
        }
        return ResolvedKey(key, cipher.unwrapWithAesKw(rootKey, key.wrappedKey))
    }

    private fun TenantMasterKey.toMetadata(): TenantKeyMetadata = TenantKeyMetadata(
        tmkId = tmkId,
        version = version,
        status = status,
        createdAt = createdAt.toString(),
        updatedAt = updatedAt.toString()
    )

    private fun ByteArray.encode(): String = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(this)
    private fun String.decode(): ByteArray = java.util.Base64.getUrlDecoder().decode(this)
}

private data class ResolvedKey(val record: TenantMasterKey, val secretKey: SecretKey)

private data class TenantMasterKey(
    val tmkId: String,
    val version: Int,
    var status: KeyStatus,
    val wrappedKey: ByteArray,
    val createdAt: kotlinx.datetime.Instant,
    var updatedAt: kotlinx.datetime.Instant
)

@Serializable
data class CreateTmkRequest(
    val tmkId: String? = null,
    val metadata: Map<String, String> = emptyMap()
)

@Serializable
data class TenantKeyResponse(
    val tenantId: String,
    val tmkId: String,
    val version: Int,
    val status: KeyStatus,
    val wrappedKey: String
)

@Serializable
enum class KeyStatus { ACTIVE, PENDING_ROTATION, DISABLED, COMPROMISED }

@Serializable
data class WrapDekRequest(
    val tenantId: String,
    val tmkId: String? = null,
    val dek: String
)

@Serializable
data class WrappedDekResponse(
    val wrappedDek: String,
    val tmkId: String
)

@Serializable
data class UnwrapDekRequest(
    val tenantId: String,
    val tmkId: String? = null,
    val wrappedDek: String
)

@Serializable
data class UnwrappedDekResponse(
    val dek: String,
    val algorithm: String
)

@Serializable
data class RotateTmkRequest(
    val tenantId: String,
    val tmkId: String,
    val metadata: Map<String, String> = emptyMap()
)

@Serializable
data class InvalidateTmkRequest(
    val tenantId: String,
    val tmkId: String,
    val status: KeyStatus
)

@Serializable
data class DeriveSskRequest(
    val tenantId: String,
    val tmkId: String,
    val sessionNonce: String
)

@Serializable
data class DeriveSskResponse(
    val ssk: String,
    val algorithm: String
)

@Serializable
data class TenantKeyMetadata(
    val tmkId: String,
    val version: Int,
    val status: KeyStatus,
    val createdAt: String,
    val updatedAt: String
)
