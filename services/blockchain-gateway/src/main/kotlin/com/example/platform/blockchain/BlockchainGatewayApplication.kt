package com.example.platform.blockchain

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
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

private val logger = LoggerFactory.getLogger("blockchain-gateway")

fun Application.module() {
    val gateway = BlockchainGateway()

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
        blockchainRoutes(gateway)
    }
}

private fun Route.blockchainRoutes(gateway: BlockchainGateway) {
    post("/blockchain/submit") {
        val request = call.receive<SubmitTransactionRequest>()
        val result = gateway.submitTransaction(request)
        call.respond(HttpStatusCode.Accepted, result)
    }

    get("/blockchain/transactions") {
        call.respond(gateway.listTransactions())
    }
}

class BlockchainGateway(
    private val ledger: ConcurrentHashMap<String, LedgerTransaction> = ConcurrentHashMap()
) {
    fun submitTransaction(request: SubmitTransactionRequest): SubmitTransactionResponse {
        val id = UUID.randomUUID().toString()
        val now = Clock.System.now()
        val transaction = LedgerTransaction(
            id = id,
            channel = request.channel,
            chaincode = request.chaincode,
            function = request.function,
            arguments = request.arguments,
            submittedAt = now,
            status = "PENDING"
        )
        ledger[id] = transaction.copy(status = "COMMITTED")
        logger.info("Accepted transaction {} for chaincode {}", id, request.chaincode)
        return SubmitTransactionResponse(transactionId = id, status = "COMMITTED")
    }

    fun listTransactions(): List<LedgerTransaction> = ledger.values.sortedBy { it.submittedAt }
}

@Serializable
data class SubmitTransactionRequest(
    val channel: String,
    val chaincode: String,
    val function: String,
    val arguments: List<String> = emptyList(),
    val transientData: Map<String, String> = emptyMap()
)

@Serializable
data class SubmitTransactionResponse(
    val transactionId: String,
    val status: String
)

@Serializable
data class LedgerTransaction(
    val id: String,
    val channel: String,
    val chaincode: String,
    val function: String,
    val arguments: List<String>,
    val submittedAt: kotlinx.datetime.Instant,
    val status: String
)
