package com.example.platform.sandbox

import com.example.platform.common.ApiError
import com.example.platform.common.SandboxSession
import com.example.platform.common.SandboxStatus
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
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import io.ktor.server.util.getOrFail
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory
import java.security.SecureRandom
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.time.Duration.Companion.seconds

private val logger = LoggerFactory.getLogger("sandbox-service")

fun Application.module() {
    val kms = SandboxKeyDeriver()
    val service = SandboxService(kms)

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
        sandboxRoutes(service)
    }
}

private fun Route.sandboxRoutes(service: SandboxService) {
    post("/sandbox/sessions") {
        val request = call.receive<CreateSandboxRequest>()
        val response = service.createSession(request)
        call.respond(HttpStatusCode.Created, response)
    }

    post("/sandbox/{id}/close") {
        val id = call.parameters.getOrFail("id")
        val request = call.receive<CloseSandboxRequest>()
        val response = service.closeSession(id, request)
        call.respond(response)
    }
}

class SandboxService(
    private val keyDeriver: SandboxKeyDeriver,
    private val storage: ConcurrentHashMap<String, SandboxContext> = ConcurrentHashMap()
) {
    fun createSession(request: CreateSandboxRequest): SandboxSessionResponse {
        require(request.ttlSeconds in 60..86_400) { "ttl must be between 60 seconds and 24 hours" }
        val now = Clock.System.now()
        val sessionId = request.sessionId ?: UUID.randomUUID().toString()
        val nonce = keyDeriver.generateNonce()
        val ssk = keyDeriver.deriveSsk(request.tenantId, nonce)
        val session = SandboxSession(
            id = sessionId,
            tenantId = request.tenantId,
            nonce = nonce.encode(),
            ttlSeconds = request.ttlSeconds,
            expiresAt = now + request.ttlSeconds.seconds,
            policy = request.policy,
            status = SandboxStatus.ACTIVE
        )
        storage[sessionId] = SandboxContext(session, ssk, now, now)
        return SandboxSessionResponse(session = session, ssk = ssk.encode())
    }

    fun closeSession(sessionId: String, request: CloseSandboxRequest): SandboxSession {
        val context = storage[sessionId] ?: throw NoSuchElementException("session $sessionId not found")
        val now = Clock.System.now()
        val updated = context.session.copy(
            status = SandboxStatus.CLOSED,
            expiresAt = now
        )
        storage[sessionId] = context.copy(session = updated, ssk = ByteArray(0), updatedAt = now)
        return updated
    }
}

class SandboxKeyDeriver(
    private val cipher: EnvelopeCipher = EnvelopeCipher(),
    private val secureRandom: SecureRandom = SecureRandom()
) {
    private val tenantKeys = ConcurrentHashMap<String, ByteArray>()

    fun deriveSsk(tenantId: String, nonce: ByteArray): ByteArray {
        val tmk = tenantKeys.computeIfAbsent(tenantId) { ByteArray(32).also(secureRandom::nextBytes) }
        return cipher.deriveSsk(tmk, nonce, tenantId)
    }

    fun generateNonce(): ByteArray = ByteArray(12).also(secureRandom::nextBytes)
}

private fun ByteArray.encode(): String = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(this)

private data class SandboxContext(
    val session: SandboxSession,
    val ssk: ByteArray,
    val createdAt: Instant,
    val updatedAt: Instant
)

@Serializable
data class CreateSandboxRequest(
    val tenantId: String,
    val ttlSeconds: Long = 3600,
    val policy: Map<String, String> = emptyMap(),
    val sessionId: String? = null
)

@Serializable
data class SandboxSessionResponse(
    val session: SandboxSession,
    val ssk: String
)

@Serializable
data class CloseSandboxRequest(
    val reason: String? = null
)
