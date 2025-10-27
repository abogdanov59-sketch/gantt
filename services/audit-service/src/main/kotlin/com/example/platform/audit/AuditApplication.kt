package com.example.platform.audit

import com.example.platform.common.ApiError
import com.example.platform.common.AuditEntry
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
import kotlinx.datetime.Clock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory
import java.security.MessageDigest
import java.util.Base64
import java.util.concurrent.CopyOnWriteArrayList

private val logger = LoggerFactory.getLogger("audit-service")

fun Application.module() {
    val store = AuditStore()

    install(CallLogging)
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true; prettyPrint = true })
    }
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            logger.error("Unexpected error", cause)
            call.respond(HttpStatusCode.InternalServerError, ApiError(code = "internal_error", message = "unexpected error"))
        }
    }

    routing {
        auditRoutes(store)
    }
}

private fun Route.auditRoutes(store: AuditStore) {
    post("/audit/events") {
        val request = call.receive<CreateAuditEventRequest>()
        val entry = store.append(request)
        call.respond(HttpStatusCode.Created, entry)
    }

    get("/audit/events") {
        call.respond(store.list())
    }
}

class AuditStore {
    private val entries = CopyOnWriteArrayList<AuditRecord>()

    fun append(request: CreateAuditEventRequest): AuditRecord {
        val now = Clock.System.now()
        val payload = AuditEntry(
            id = generateId(now, request.subject),
            category = request.category,
            subject = request.subject,
            action = request.action,
            occurredAt = now,
            attributes = request.attributes
        )
        val previousHash = entries.lastOrNull()?.chainHash ?: ""
        val chainHash = hash(previousHash + payload.id + payload.occurredAt.toString())
        val record = AuditRecord(entry = payload, chainHash = chainHash, previousHash = previousHash)
        entries.add(record)
        return record
    }

    fun list(): List<AuditRecord> = entries.toList()

    private fun hash(input: String): String = Base64.getUrlEncoder().withoutPadding()
        .encodeToString(MessageDigest.getInstance("SHA-256").digest(input.toByteArray()))

    private fun generateId(now: kotlinx.datetime.Instant, subject: String): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString((subject + now.toString()).toByteArray())
}

@Serializable
data class CreateAuditEventRequest(
    val category: String,
    val subject: String,
    val action: String,
    val attributes: Map<String, String> = emptyMap()
)

@Serializable
data class AuditRecord(
    val entry: AuditEntry,
    val chainHash: String,
    val previousHash: String
)
