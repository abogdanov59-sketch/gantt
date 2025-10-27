package com.example.platform.common

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class AssetState { CREATED, PENDING, APPROVED, REJECTED }

@Serializable
data class Asset(
    val id: String,
    val tenantId: String,
    val type: String,
    val metadataHash: String,
    val state: AssetState = AssetState.CREATED,
    val ownerOrg: String,
    val createdAt: Instant,
    val updatedAt: Instant,
    val onChainRef: String? = null
)

@Serializable
enum class OrderState { CREATED, APPROVED, DISPATCHED, COMPLETED, CANCELLED }

@Serializable
data class Signature(
    val signer: String,
    val algorithm: String,
    val value: String,
    val signedAt: Instant
)

@Serializable
data class Order(
    val id: String,
    val assetId: String,
    val buyerOrg: String,
    val sellerOrg: String,
    val termsHash: String,
    val state: OrderState = OrderState.CREATED,
    val signatures: List<Signature> = emptyList(),
    val onChainRef: String? = null,
    val createdAt: Instant,
    val updatedAt: Instant
)

@Serializable
data class ShipmentEvent(
    val code: String,
    val occurredAt: Instant,
    val detailsHash: String
)

@Serializable
data class Shipment(
    val id: String,
    val assetId: String,
    val carrierOrg: String,
    val route: List<String>,
    val events: List<ShipmentEvent> = emptyList(),
    val state: String,
    val onChainRef: String? = null,
    val createdAt: Instant,
    val updatedAt: Instant
)

@Serializable
data class LabReport(
    val id: String,
    val assetId: String,
    val labOrg: String,
    val reportHash: String,
    val reportUri: String? = null,
    val signature: Signature? = null,
    val result: String,
    val onChainRef: String? = null,
    val createdAt: Instant,
    val updatedAt: Instant
)

@Serializable
enum class GrantStatus { ACTIVE, REVOKED, EXPIRED }

@Serializable
@SerialName("Grant")
data class Grant(
    val id: String,
    val assetId: String,
    val subject: String,
    val scope: String,
    val conditions: Map<String, String> = emptyMap(),
    val validFrom: Instant,
    val validUntil: Instant?,
    val status: GrantStatus = GrantStatus.ACTIVE
)

@Serializable
data class Envelope(
    val cipherAlgo: String,
    val nonce: String,
    val aad: String,
    val ciphertext: String,
    val tag: String,
    val wrappedDek: String,
    val dekAlgo: String,
    val tmkId: String,
    val version: Int
)

@Serializable
data class EncryptedRecord(
    val id: String,
    val tenantId: String,
    val envelope: Envelope,
    val blindIndexes: Map<String, String> = emptyMap(),
    val createdAt: Instant,
    val updatedAt: Instant
)

@Serializable
data class ApiError(
    val code: String,
    val message: String
)

@Serializable
data class SandboxSession(
    val id: String,
    val tenantId: String,
    val nonce: String,
    val ttlSeconds: Long,
    val expiresAt: Instant,
    val policy: Map<String, String> = emptyMap(),
    val status: SandboxStatus = SandboxStatus.ACTIVE
)

@Serializable
enum class SandboxStatus { ACTIVE, CLOSED, EXPIRED }

@Serializable
data class AuditEntry(
    val id: String,
    val category: String,
    val subject: String,
    val action: String,
    val occurredAt: Instant,
    val attributes: Map<String, String>
)
