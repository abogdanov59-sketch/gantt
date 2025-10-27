package com.example.platform.apigw

import com.example.platform.common.ApiError
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.plugins.callloging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation as ServerContentNegotiation
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import org.slf4j.LoggerFactory

private val logger = LoggerFactory.getLogger("api-gateway")

fun Application.module() {
    val httpClient = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; prettyPrint = true })
        }
    }
    val gateway = AggregationService(httpClient)

    install(CallLogging)
    install(ServerContentNegotiation) {
        json(Json { ignoreUnknownKeys = true; prettyPrint = true })
    }
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            logger.error("Gateway error", cause)
            call.respond(HttpStatusCode.InternalServerError, ApiError(code = "internal_error", message = "unexpected error"))
        }
    }

    routing {
        apiRoutes(gateway)
    }
}

private fun Route.apiRoutes(service: AggregationService) {
    post("/api/orders") {
        val request = call.receive<ApiGatewayOrderRequest>()
        val response = service.createOrder(request)
        call.respond(HttpStatusCode.Created, response)
    }
}

class AggregationService(private val client: HttpClient) {
    suspend fun createOrder(request: ApiGatewayOrderRequest): ApiGatewayOrderResponse {
        val vaultResponse: JsonObject = client.post("http://localhost:8082/vault/assets") {
            contentType(ContentType.Application.Json)
            setBody(
                mapOf(
                    "tenantId" to request.tenantId,
                    "ownerOrg" to request.ownerOrg,
                    "type" to "ORDER",
                    "metadata" to request.metadata,
                    "payload" to request.payload,
                    "searchableFields" to mapOf("orderNumber" to request.orderNumber)
                )
            )
        }.body()
        return ApiGatewayOrderResponse(message = "Order accepted", vaultResponse = vaultResponse)
    }
}

@Serializable
data class ApiGatewayOrderRequest(
    val tenantId: String,
    val ownerOrg: String,
    val orderNumber: String,
    val metadata: String,
    val payload: String
)

@Serializable
data class ApiGatewayOrderResponse(
    val message: String,
    val vaultResponse: JsonObject
)
