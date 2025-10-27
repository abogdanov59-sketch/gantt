package com.example.platform.crypto

import com.example.platform.common.Envelope
import java.nio.ByteBuffer
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.Mac
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

private const val GCM_TAG_LENGTH_BITS = 128
private const val NONCE_SIZE_BYTES = 12
private const val HKDF_OUTPUT_SIZE = 32

class EnvelopeCipher(
    private val secureRandom: SecureRandom = SecureRandom()
) {

    fun generateDek(): SecretKey {
        val generator = KeyGenerator.getInstance("AES")
        generator.init(256)
        return generator.generateKey()
    }

    fun encrypt(
        plaintext: ByteArray,
        aad: ByteArray,
        dek: SecretKey,
        tmkId: String,
        version: Int,
        wrapDek: (SecretKey) -> ByteArray
    ): EnvelopePayload {
        val nonce = ByteArray(NONCE_SIZE_BYTES).also(secureRandom::nextBytes)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, nonce)
        cipher.init(Cipher.ENCRYPT_MODE, dek, spec)
        cipher.updateAAD(aad)
        val cipherTextWithTag = cipher.doFinal(plaintext)
        val cipherText = cipherTextWithTag.copyOf(cipherTextWithTag.size - GCM_TAG_LENGTH_BITS / 8)
        val tag = cipherTextWithTag.copyOfRange(cipherTextWithTag.size - GCM_TAG_LENGTH_BITS / 8, cipherTextWithTag.size)
        val wrappedDek = wrapDek(dek)
        return EnvelopePayload(
            envelope = Envelope(
                cipherAlgo = "AES-256-GCM",
                nonce = nonce.encode(),
                aad = aad.encode(),
                ciphertext = cipherText.encode(),
                tag = tag.encode(),
                wrappedDek = wrappedDek.encode(),
                dekAlgo = "AES-256",
                tmkId = tmkId,
                version = version
            ),
            dek = dek,
            tag = tag,
            nonce = nonce
        )
    }

    fun decrypt(envelope: Envelope, unwrapDek: (ByteArray, String) -> SecretKey): ByteArray {
        val dek = unwrapDek(envelope.wrappedDek.decode(), envelope.tmkId)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val nonce = envelope.nonce.decode()
        val spec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, nonce)
        cipher.init(Cipher.DECRYPT_MODE, dek, spec)
        cipher.updateAAD(envelope.aad.decode())
        val cipherText = envelope.ciphertext.decode()
        val tag = envelope.tag.decode()
        val combined = ByteBuffer.allocate(cipherText.size + tag.size)
            .put(cipherText)
            .put(tag)
            .array()
        return cipher.doFinal(combined)
    }

    fun hkdf(inputKeyMaterial: ByteArray, salt: ByteArray, info: ByteArray, size: Int = HKDF_OUTPUT_SIZE): ByteArray {
        require(size <= HKDF_OUTPUT_SIZE) { "Requested size exceeds HKDF output limit" }
        val mac = Mac.getInstance("HmacSHA256")
        val key = SecretKeySpec(if (salt.isEmpty()) ByteArray(mac.macLength) else salt, "HmacSHA256")
        mac.init(key)
        val prk = mac.doFinal(inputKeyMaterial)
        mac.init(SecretKeySpec(prk, "HmacSHA256"))
        mac.update(info)
        mac.update(1)
        return mac.doFinal().copyOf(size)
    }

    fun deriveSsk(tmkMaterial: ByteArray, nonce: ByteArray, tenantId: String): ByteArray {
        val info = ByteBuffer.allocate(nonce.size + tenantId.toByteArray().size)
            .put(nonce)
            .put(tenantId.toByteArray())
            .array()
        return hkdf(tmkMaterial, nonce, info)
    }

    fun computeBlindIndex(value: String, pepper: ByteArray): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(pepper, "HmacSHA256"))
        return mac.doFinal(value.toByteArray()).encode()
    }

    fun sha256(input: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(input).encode()

    fun unwrapWithAesKw(rootKey: SecretKey, wrappedKey: ByteArray): SecretKey {
        val cipher = Cipher.getInstance("AESWrap")
        cipher.init(Cipher.UNWRAP_MODE, rootKey)
        val key = cipher.unwrap(wrappedKey, "AES", Cipher.SECRET_KEY)
        return SecretKeySpec(key.encoded, "AES")
    }

    fun wrapWithAesKw(rootKey: SecretKey, key: SecretKey): ByteArray {
        val cipher = Cipher.getInstance("AESWrap")
        cipher.init(Cipher.WRAP_MODE, rootKey)
        return cipher.wrap(key)
    }

    private fun ByteArray.encode(): String = Base64.getUrlEncoder().withoutPadding().encodeToString(this)
    private fun String.decode(): ByteArray = Base64.getUrlDecoder().decode(this)
}

data class EnvelopePayload(
    val envelope: Envelope,
    val dek: SecretKey,
    val tag: ByteArray,
    val nonce: ByteArray
)
