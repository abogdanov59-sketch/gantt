package com.example.platform.identity

import com.example.platform.common.ApiError
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
import java.util.concurrent.ConcurrentHashMap

private val logger = LoggerFactory.getLogger("identity-service")

fun Application.module() {
    val service = IdentityService()

    install(CallLogging)
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true; prettyPrint = true })
    }
    install(StatusPages) {
        exception<IllegalArgumentException> { call, cause ->
            logger.warn("Bad request", cause)
            call.respond(HttpStatusCode.BadRequest, ApiError(code = "validation_error", message = cause.message ?: "invalid request"))
        }
        exception<Throwable> { call, cause ->
            logger.error("Unexpected error", cause)
            call.respond(HttpStatusCode.InternalServerError, ApiError(code = "internal_error", message = "unexpected error"))
        }
    }

    routing {
        identityRoutes(service)
    }
}

private fun Route.identityRoutes(service: IdentityService) {
    get("/identity/tenants") {
        call.respond(service.listTenants())
    }

    post("/identity/policies/evaluate") {
        val request = call.receive<PolicyEvaluationRequest>()
        val result = service.evaluatePolicy(request)
        call.respond(result)
    }
}

class IdentityService {
    private val tenants = ConcurrentHashMap<String, TenantRecord>()

    init {
        createTenant("default")
    }

    fun listTenants(): List<TenantDescriptor> = tenants.values.map {
        TenantDescriptor(id = it.id, displayName = it.displayName, createdAt = it.createdAt.toString())
    }

    fun evaluatePolicy(request: PolicyEvaluationRequest): PolicyEvaluationResult {
        val tenant = tenants[request.tenantId] ?: throw IllegalArgumentException("tenant ${request.tenantId} not found")
        val grants = tenant.grants[request.subject] ?: emptySet()
        val decision = if (request.action in grants) "Permit" else "Deny"
        return PolicyEvaluationResult(
            tenantId = tenant.id,
            subject = request.subject,
            action = request.action,
            decision = decision,
            attributes = request.attributes
        )
    }

    private fun createTenant(name: String) {
        tenants.computeIfAbsent(name) {
            TenantRecord(id = name, displayName = name.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() })
        }
    }
}

private data class TenantRecord(
    val id: String,
    val displayName: String,
    val createdAt: kotlinx.datetime.Instant = Clock.System.now(),
    val grants: MutableMap<String, MutableSet<String>> = mutableMapOf(
        "system" to mutableSetOf("*"),
        "auditor" to mutableSetOf("read")
    )
)

@Serializable
data class TenantDescriptor(
    val id: String,
    val displayName: String,
    val createdAt: String
)

@Serializable
data class PolicyEvaluationRequest(
    val tenantId: String,
    val subject: String,
    val action: String,
    val attributes: Map<String, String> = emptyMap()
)

@Serializable
data class PolicyEvaluationResult(
    val tenantId: String,
    val subject: String,
    val action: String,
    val decision: String,
    val attributes: Map<String, String>
)
