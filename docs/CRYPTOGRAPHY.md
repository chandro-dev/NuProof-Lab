# Cryptography

## Receipt payload

The signed payload contains `schemaVersion`, issuer, transaction/receipt UUIDs,
integer minor amount, currency, ISO issuance time, masked destination, reference,
issuance status and `keyId`.

`canonicalizeReceipt()` recursively sorts object keys and rejects non-safe
integer numbers. UTF-8 bytes are therefore identical for logically identical
payloads.

## Algorithms

1. `buildReceiptPayload()` creates the immutable snapshot.
2. `canonicalizeReceipt()` creates deterministic JSON.
3. `hashReceipt()` computes SHA-256 over the UTF-8 bytes.
4. `SigningProvider.sign()` creates an Ed25519 signature over those same bytes.
5. Verification rebuilds the payload from the stored receipt, resolves the
   historical public key and independently validates hash and signature.

SHA-256 is an integrity checksum, not a replacement for the signature.

## Keys

`npm run keys:generate` writes an ignored PKCS#8 private PEM, SPKI public PEM,
single-line base64 environment values and a public registry. Production should
replace `EnvironmentSigningProvider` with KMS/HSM signing. Old public keys must
remain resolvable after rotation.

## Verification tokens

Tokens contain 256 random bits. The public token appears only in the issuance
response and the URL fragment (`#token=...`), which browsers do not send in GET
requests or access logs. PostgreSQL stores
`HMAC-SHA-256(serverPepper, token)` and comparison uses fixed-size,
constant-time buffers.
