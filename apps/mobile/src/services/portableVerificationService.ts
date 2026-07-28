import * as ed25519 from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import {
  canonicalizeReceiptPayload,
  type QrPayloadV2,
  type VerificationResult
} from "@nuproof/shared";
import { getTrustedPublicKey } from "@/security/trustedKeys";
import { STATUS_LOOKUP_ENABLED } from "./apiClient";
import { verifyReceipt } from "./verificationService";

ed25519.hashes.sha512 = sha512;

function decodeBase64Url(value: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const output: number[] = [];
  let accumulator = 0;
  let bitCount = 0;

  for (const character of value) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("INVALID_BASE64URL");
    accumulator = accumulator * 64 + index;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      output.push(Math.floor(accumulator / 2 ** bitCount) & 0xff);
      accumulator %= 2 ** bitCount;
    }
  }
  return Uint8Array.from(output);
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function verifyPortableProof(
  qr: QrPayloadV2,
  resolvePublicKey: (keyId: string) => string | undefined = getTrustedPublicKey
): VerificationResult {
  const trustedPublicKey = resolvePublicKey(qr.payload.keyId);
  const canonical = canonicalizeReceiptPayload(qr.payload);
  const message = new TextEncoder().encode(canonical);
  const integrityValid = bytesToHex(sha256(message)) === qr.payloadHash;
  let signatureValid = false;

  if (trustedPublicKey && integrityValid) {
    try {
      signatureValid = ed25519.verify(
        decodeBase64Url(qr.signature),
        message,
        decodeBase64Url(trustedPublicKey),
        { zip215: false }
      );
    } catch {
      signatureValid = false;
    }
  }

  const authentic = signatureValid && integrityValid;
  return {
    code: authentic ? "VERIFIED" : "INVALID_SIGNATURE",
    authentic,
    signatureValid,
    integrityValid,
    verificationId: `portable-${qr.payload.receiptId}`,
    currentStatusAvailable: false,
    verificationSource: "PORTABLE_QR",
    transaction: authentic
      ? {
          amount: qr.payload.amount,
          currency: qr.payload.currency,
          timestamp: qr.payload.timestamp,
          destinationMasked: qr.payload.destinationMasked,
          status: qr.payload.issuedStatus,
          receiptId: qr.payload.receiptId,
          transactionIdSuffix: qr.payload.transactionId.slice(-8)
        }
      : undefined
  };
}

export async function verifyPortableProofWithStatus(
  qr: QrPayloadV2,
  lookupStatus: typeof verifyReceipt = verifyReceipt,
  resolvePublicKey: (keyId: string) => string | undefined = getTrustedPublicKey
): Promise<VerificationResult> {
  const portable = verifyPortableProof(qr, resolvePublicKey);
  if (!portable.authentic) return portable;
  if (!STATUS_LOOKUP_ENABLED && lookupStatus === verifyReceipt) {
    return {
      ...portable,
      statusLookupCode: "SERVER_UNAVAILABLE"
    };
  }

  try {
    const online = await lookupStatus(qr.payload.receiptId, qr.token);
    if (online.code === "VERIFIED" && online.authentic) return online;
    return {
      ...portable,
      statusLookupCode: online.code
    };
  } catch {
    return {
      ...portable,
      statusLookupCode: "SERVER_UNAVAILABLE"
    };
  }
}
