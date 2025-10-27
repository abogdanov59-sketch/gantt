package com.example.platform.terminal

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import java.security.KeyPairGenerator
import java.security.Signature
import java.util.Base64

fun main(args: Array<String>) = runBlocking {
    val config = AgentConfig.fromArgs(args)
    val client = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; prettyPrint = true })
        }
    }
    val signer = TerminalSigner()
    val payload = signer.signPayload(config.payload)
    val response: JsonObject = client.post(config.endpoint) {
        contentType(ContentType.Application.Json)
        setBody(TerminalSubmission(payload = payload, tenantId = config.tenantId))
    }.body()
    println("Gateway response: $response")
}

@Serializable
data class AgentConfig(
    val endpoint: String,
    val tenantId: String,
    val payload: String
) {
    companion object {
        fun fromArgs(args: Array<String>): AgentConfig {
            if (args.size < 3) {
                throw IllegalArgumentException("Usage: terminal-agent <endpoint> <tenantId> <payload>")
            }
            return AgentConfig(endpoint = args[0], tenantId = args[1], payload = args[2])
        }
    }
}

class TerminalSigner {
    private val keyPair = KeyPairGenerator.getInstance("EC").apply { initialize(256) }.generateKeyPair()

    fun signPayload(payload: String): SignedPayload {
        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(keyPair.private)
        signature.update(payload.toByteArray())
        val signatureBytes = signature.sign()
        return SignedPayload(
            payload = payload,
            signature = Base64.getUrlEncoder().withoutPadding().encodeToString(signatureBytes),
            algorithm = "ECDSA_P256",
            certificate = Base64.getUrlEncoder().withoutPadding().encodeToString(keyPair.public.encoded)
        )
    }
}

@Serializable
data class SignedPayload(
    val payload: String,
    val signature: String,
    val algorithm: String,
    val certificate: String
)

@Serializable
data class TerminalSubmission(
    val payload: SignedPayload,
    val tenantId: String
)
