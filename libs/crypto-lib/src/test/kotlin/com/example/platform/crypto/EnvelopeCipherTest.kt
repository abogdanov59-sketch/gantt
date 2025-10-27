package com.example.platform.crypto

import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

class EnvelopeCipherTest {
    private val cipher = EnvelopeCipher()
    private val rootKey: SecretKey = SecretKeySpec(ByteArray(32) { it.toByte() }, "AES")

    @Test
    fun `encrypt and decrypt roundtrip`() {
        val dek = cipher.generateDek()
        val aad = "tenant-1|asset-1|order".toByteArray()
        val payload = cipher.encrypt(
            plaintext = "hello world".toByteArray(),
            aad = aad,
            dek = dek,
            tmkId = "tmk-1",
            version = 1
        ) { key -> cipher.wrapWithAesKw(rootKey, key) }

        val decrypted = cipher.decrypt(payload.envelope) { wrappedDek, _ ->
            cipher.unwrapWithAesKw(rootKey, wrappedDek)
        }

        assertContentEquals("hello world".toByteArray(), decrypted)
    }

    @Test
    fun `derive ssk is deterministic`() {
        val tmkMaterial = ByteArray(32) { (it * 2).toByte() }
        val nonce = ByteArray(12) { (it * 3).toByte() }
        val ssk1 = cipher.deriveSsk(tmkMaterial, nonce, "tenant-a")
        val ssk2 = cipher.deriveSsk(tmkMaterial, nonce, "tenant-a")
        assertContentEquals(ssk1, ssk2)
    }

    @Test
    fun `blind index is stable`() {
        val pepper = ByteArray(32) { 1 }
        val index1 = cipher.computeBlindIndex("value", pepper)
        val index2 = cipher.computeBlindIndex("value", pepper)
        assertEquals(index1, index2)
    }
}
