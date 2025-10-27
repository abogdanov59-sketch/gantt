package com.example.platform.datavault

import com.example.platform.common.ApiError
import com.example.platform.common.EncryptedRecord
import com.example.platform.common.Envelope
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
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import javax.crypto.SecretKey

private val logger = LoggerFactory.getLogger("data-vault-service")

fun Application.module() {
    val pepper = ByteArray(32) { 42 }
    val service = DataVaultService(cipher = EnvelopeCipher(), kms = InMemoryKmsFacade(), pepper = pepper)

    install(CallLogging)
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true; prettyPrint = true })
    }
    install(StatusPages) {
        exception<IllegalArgumentException> { call, cause ->
            logger.warn("Bad request", cause)
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
        vaultRoutes(service)
    }
}

private fun Route.vaultRoutes(service: DataVaultService) {
    post("/vault/assets") {
        val request = call.receive<CreateAssetRequest>()
        val response = service.createAsset(request)
        call.respond(HttpStatusCode.Created, response)
    }

    get("/vault/assets/{id}") {
        val id = call.parameters.getOrFail("id")
        val response = service.getEncrypted(id)
        call.respond(response)
    }

    post("/vault/assets/{id}/decrypt") {
        val id = call.parameters.getOrFail("id")
        val response = service.decryptAsset(id)
        call.respond(response)
    }
}

class DataVaultService(
    private val cipher: EnvelopeCipher,
    private val kms: KmsFacade,
    private val pepper: ByteArray
) {
    private val storage = ConcurrentHashMap<String, VaultEntry>()

    fun createAsset(request: CreateAssetRequest): CreateAssetResponse {
        require(request.payload.isNotBlank()) { "payload required" }
        val now = Clock.System.now()
        val dek = cipher.generateDek()
        val tenantKey = kms.ensureTenantKey(request.tenantId)
        val aad = "${request.tenantId}|${request.type}|${tenantKey.tmkId}|${tenantKey.version}".toByteArray()
        val envelopePayload = cipher.encrypt(
            plaintext = request.payload.toByteArray(),
            aad = aad,
            dek = dek,
            tmkId = tenantKey.tmkId,
            version = tenantKey.version,
            wrapDek = { key -> kms.wrapDek(request.tenantId, tenantKey, key) }
        )
        val blindIndexes = request.searchableFields.mapValues { (_, value) -> cipher.computeBlindIndex(value, pepper) }
        val metadataHash = cipher.sha256(request.metadata.toByteArray())
        val record = EncryptedRecord(
            id = request.assetId ?: UUID.randomUUID().toString(),
            tenantId = request.tenantId,
            envelope = envelopePayload.envelope,
            blindIndexes = blindIndexes,
            createdAt = now,
            updatedAt = now
        )
        storage[record.id] = VaultEntry(record, metadataHash, now, now)
        return CreateAssetResponse(
            id = record.id,
            tenantId = record.tenantId,
            metadataHash = metadataHash,
            envelope = record.envelope,
            onChainHash = cipher.sha256((record.id + metadataHash).toByteArray())
        )
    }

    fun getEncrypted(id: String): EncryptedRecord = storage[id]?.record ?: throw NoSuchElementException("asset $id not found")

    fun decryptAsset(id: String): DecryptAssetResponse {
        val stored = storage[id] ?: throw NoSuchElementException("asset $id not found")
        val envelope = stored.record.envelope
        val plaintext = cipher.decrypt(envelope) { wrappedDek, tmkId ->
            val keyHandle = kms.resolveTenantKey(stored.record.tenantId, tmkId)
            kms.unwrapDek(stored.record.tenantId, keyHandle, wrappedDek)
        }
        return DecryptAssetResponse(
            id = stored.record.id,
            tenantId = stored.record.tenantId,
            plaintext = plaintext.decodeToString(),
            metadataHash = stored.metadataHash
        )
    }
}

private data class VaultEntry(
    val record: EncryptedRecord,
    val metadataHash: String,
    val createdAt: Instant,
    val updatedAt: Instant
)

interface KmsFacade {
    fun ensureTenantKey(tenantId: String): TenantKeyHandle
    fun wrapDek(tenantId: String, handle: TenantKeyHandle, dek: SecretKey): ByteArray
    fun unwrapDek(tenantId: String, handle: TenantKeyHandle, wrappedDek: ByteArray): SecretKey
    fun resolveTenantKey(tenantId: String, tmkId: String): TenantKeyHandle
}

class InMemoryKmsFacade(
    private val cipher: EnvelopeCipher = EnvelopeCipher()
) : KmsFacade {
    private val rootKey = cipher.generateDek()
    private val tenantKeys = ConcurrentHashMap<String, TenantKeyHandle>()

    override fun ensureTenantKey(tenantId: String): TenantKeyHandle = tenantKeys.computeIfAbsent(tenantId) {
        val tmk = cipher.generateDek()
        val wrapped = cipher.wrapWithAesKw(rootKey, tmk)
        TenantKeyHandle(
            tenantId = tenantId,
            tmkId = "tmk-$tenantId",
            version = 1,
            wrapped = wrapped,
            secretKey = tmk
        )
    }

    override fun wrapDek(tenantId: String, handle: TenantKeyHandle, dek: SecretKey): ByteArray {
        require(handle.tenantId == tenantId) { "mismatched tenant" }
        return cipher.wrapWithAesKw(handle.secretKey, dek)
    }

    override fun unwrapDek(tenantId: String, handle: TenantKeyHandle, wrappedDek: ByteArray): SecretKey {
        require(handle.tenantId == tenantId) { "mismatched tenant" }
        return cipher.unwrapWithAesKw(handle.secretKey, wrappedDek)
    }

    override fun resolveTenantKey(tenantId: String, tmkId: String): TenantKeyHandle {
        val handle = tenantKeys[tenantId] ?: throw NoSuchElementException("tenant $tenantId not found")
        if (handle.tmkId != tmkId) {
            throw NoSuchElementException("tmk $tmkId not found for tenant $tenantId")
        }
        return handle
    }
}

data class TenantKeyHandle(
    val tenantId: String,
    val tmkId: String,
    val version: Int,
    val wrapped: ByteArray,
    val secretKey: SecretKey
)

@Serializable
data class CreateAssetRequest(
    val tenantId: String,
    val ownerOrg: String,
    val type: String,
    val metadata: String,
    val payload: String,
    val searchableFields: Map<String, String> = emptyMap(),
    val assetId: String? = null
)

@Serializable
data class CreateAssetResponse(
    val id: String,
    val tenantId: String,
    val metadataHash: String,
    val envelope: Envelope,
    val onChainHash: String
)

@Serializable
data class DecryptAssetResponse(
    val id: String,
    val tenantId: String,
    val plaintext: String,
    val metadataHash: String
)
