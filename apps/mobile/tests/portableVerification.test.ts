import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canonicalizeReceiptPayload,
  type CanonicalReceiptPayload,
  type QrPayloadV2
} from "@nuproof/shared";
import {
  verifyPortableProof,
  verifyPortableProofWithStatus
} from "@/services/portableVerificationService";

function createSignedQr(): { qr: QrPayloadV2; publicKey: string } {
  const keys = generateKeyPairSync("ed25519");
  const payload: CanonicalReceiptPayload = {
    version: 1,
    issuer: "NuProof Lab",
    transactionId: "6407e4c5-1c23-4df7-831f-54ed6869c717",
    receiptId: "df63f38b-baa4-43c0-a274-57857a288eb1",
    amount: 100_000,
    currency: "COP",
    timestamp: "2026-07-28T15:42:00.000Z",
    destinationMasked: "**** 5832",
    reference: "Demo portable",
    issuedStatus: "SETTLED",
    keyId: "test-portable-key"
  };
  const canonical = canonicalizeReceiptPayload(payload);
  const publicDer = keys.publicKey.export({ format: "der", type: "spki" });
  return {
    qr: {
      type: "NUPROOF_RECEIPT",
      version: 2,
      payload,
      signature: sign(null, Buffer.from(canonical), keys.privateKey).toString("base64url"),
      payloadHash: createHash("sha256").update(canonical).digest("hex"),
      token: "test-token-with-at-least-thirty-two-characters"
    },
    publicKey: publicDer.subarray(publicDer.length - 32).toString("base64url")
  };
}

describe("portable receipt verification", () => {
  it("verifies a self-contained QR without an API", () => {
    const { qr, publicKey } = createSignedQr();
    expect(verifyPortableProof(qr, () => publicKey)).toMatchObject({
      code: "VERIFIED",
      authentic: true,
      signatureValid: true,
      integrityValid: true,
      currentStatusAvailable: false,
      verificationSource: "PORTABLE_QR"
    });
  });

  it("rejects 100000 changed to 8000000 even with a recomputed hash", () => {
    const { qr, publicKey } = createSignedQr();
    const tamperedPayload = { ...qr.payload, amount: 8_000_000 };
    const tampered: QrPayloadV2 = {
      ...qr,
      payload: tamperedPayload,
      payloadHash: createHash("sha256")
        .update(canonicalizeReceiptPayload(tamperedPayload))
        .digest("hex")
    };
    expect(verifyPortableProof(tampered, () => publicKey)).toMatchObject({
      code: "INVALID_SIGNATURE",
      authentic: false,
      signatureValid: false,
      integrityValid: true
    });
  });

  it("rejects an unknown issuer key", () => {
    const { qr } = createSignedQr();
    expect(verifyPortableProof(qr, () => undefined)).toMatchObject({
      code: "INVALID_SIGNATURE",
      authentic: false,
      signatureValid: false
    });
  });

  it("keeps the document verified when the status API is unavailable", async () => {
    const { qr, publicKey } = createSignedQr();
    const portable = verifyPortableProof(qr, () => publicKey);
    const result = await verifyPortableProofWithStatus(
      qr,
      async () => {
        throw new Error("SERVER_UNAVAILABLE");
      },
      () => publicKey
    );

    expect(portable.authentic).toBe(true);
    expect(result).toMatchObject({
      code: "VERIFIED",
      authentic: true,
      currentStatusAvailable: false,
      statusLookupCode: "SERVER_UNAVAILABLE"
    });
  });
});
