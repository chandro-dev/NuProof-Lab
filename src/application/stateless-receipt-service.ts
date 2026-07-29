import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { Transaction, TransactionStatus } from "@/src/domain/model";
import type {
  PublicKeyRegistry,
  SignatureVerifier,
  SigningProvider
} from "@/src/domain/ports";
import {
  canonicalizeReceipt,
  hashReceipt,
  receiptBytes
} from "@/src/domain/receipt-crypto";
import {
  decodeReceiptEnvelope,
  type ReceiptEnvelope
} from "@/src/domain/stateless-envelope";
import type {
  IssuedReceiptView,
  SecurityLabAnalysis,
  SecurityTraceCheck,
  VerificationResult,
  VerifyReceiptInput
} from "@/src/types/contracts";

function hashesMatch(actual: string, expected: string): boolean {
  const left = Buffer.from(actual, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export class StatelessReceiptService {
  public constructor(
    private readonly signing: SigningProvider,
    private readonly keys: PublicKeyRegistry,
    private readonly verifier: SignatureVerifier,
    private readonly appUrl: string
  ) {}

  public async issue(transaction: Transaction, now = new Date()): Promise<IssuedReceiptView> {
    const receiptId = randomUUID();
    const keyId = this.signing.activeKeyId();
    const payload = {
      schemaVersion: 1 as const,
      issuer: "NUPROOF_LAB" as const,
      transactionId: transaction.id,
      receiptId,
      amountMinor: transaction.amountMinor,
      currency: "COP" as const,
      issuedAt: now.toISOString(),
      destinationMasked: transaction.destinationMasked,
      reference: transaction.reference,
      statusAtIssuance: transaction.status,
      keyId
    };
    const signed = await this.signing.sign(receiptBytes(payload));
    if (signed.keyId !== keyId) {
      throw new Error("The signing provider returned an unexpected key ID");
    }
    const envelope: ReceiptEnvelope = {
      version: 1,
      payload,
      recipientAlias: transaction.recipientAlias,
      payloadHash: hashReceipt(payload),
      signature: signed.signature
    };
    const token = Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
    return {
      id: receiptId,
      transactionId: transaction.id,
      amountMinor: transaction.amountMinor,
      currency: "COP",
      recipientAlias: transaction.recipientAlias,
      destinationMasked: transaction.destinationMasked,
      reference: transaction.reference,
      issuedAt: payload.issuedAt,
      statusAtIssuance: transaction.status,
      currentStatus: transaction.status,
      keyId,
      payloadHash: envelope.payloadHash,
      signature: envelope.signature,
      verificationToken: token,
      verificationUrl: `${this.appUrl}/verify/${receiptId}#token=${encodeURIComponent(token)}`
    };
  }

  public async verify(input: VerifyReceiptInput): Promise<VerificationResult> {
    const verificationId = randomUUID();
    let envelope: ReceiptEnvelope;
    try {
      envelope = decodeReceiptEnvelope(input.token);
    } catch {
      return this.failure("INVALID_VERIFICATION_TOKEN", verificationId);
    }
    if (envelope.payload.receiptId !== input.receiptId) {
      return this.failure("NOT_FOUND", verificationId);
    }
    const computedHash = hashReceipt(envelope.payload);
    const key = await this.keys.resolve(envelope.payload.keyId);
    const integrityValid = hashesMatch(computedHash, envelope.payloadHash);
    const signatureValid =
      key !== null &&
      (await this.verifier.verify(
        receiptBytes(envelope.payload),
        envelope.signature,
        key.publicKey
      ));
    if (!integrityValid || !signatureValid) {
      return this.failure("INVALID_SIGNATURE", verificationId);
    }
    return {
      result: "VERIFIED",
      authentic: true,
      signatureValid: true,
      integrityValid: true,
      verificationId,
      receipt: {
        id: envelope.payload.receiptId,
        amountMinor: envelope.payload.amountMinor,
        currency: "COP",
        destinationMasked: envelope.payload.destinationMasked,
        issuedAt: envelope.payload.issuedAt,
        statusAtIssuance: envelope.payload.statusAtIssuance
      },
      transaction: { currentStatus: envelope.payload.statusAtIssuance }
    };
  }

  public async analyze(
    input: VerifyReceiptInput,
    presentedAmountMinor?: number,
    currentStatus?: TransactionStatus
  ): Promise<SecurityLabAnalysis> {
    const verificationId = randomUUID();
    let envelope: ReceiptEnvelope;
    try {
      envelope = decodeReceiptEnvelope(input.token);
    } catch {
      return this.analysisFailure("INVALID_VERIFICATION_TOKEN", verificationId, "TOKEN");
    }
    if (envelope.payload.receiptId !== input.receiptId) {
      return this.analysisFailure("NOT_FOUND", verificationId, "RECEIPT_LOOKUP");
    }
    const inspectedPayload = {
      ...envelope.payload,
      ...(presentedAmountMinor === undefined ? {} : { amountMinor: presentedAmountMinor })
    };
    const canonical = canonicalizeReceipt(inspectedPayload);
    const computedHash = hashReceipt(inspectedPayload);
    const integrityValid = hashesMatch(computedHash, envelope.payloadHash);
    const key = await this.keys.resolve(envelope.payload.keyId);
    const signatureValid =
      key !== null &&
      (await this.verifier.verify(
        receiptBytes(inspectedPayload),
        envelope.signature,
        key.publicKey
      ));
    const status = currentStatus ?? envelope.payload.statusAtIssuance;
    const reversed = status === "REVERSED";
    const checks: SecurityTraceCheck[] = [
      { id: "RECEIPT_LOOKUP", state: "PASS", title: "Evidencia autocontenida", summary: "El receiptId coincide con el sobre firmado del QR." },
      { id: "TOKEN", state: "PASS", title: "Sobre de verificación", summary: "El QR contiene un sobre estructurado válido." },
      { id: "CANONICALIZATION", state: "PASS", title: "Payload canónico", summary: `${Buffer.byteLength(canonical, "utf8")} bytes deterministas listos para validar.` },
      { id: "HASH", state: integrityValid ? "PASS" : "FAIL", title: "Integridad SHA-256", summary: integrityValid ? "El hash calculado coincide con el hash incluido." : "Los hashes son diferentes." },
      { id: "PUBLIC_KEY", state: key ? "PASS" : "FAIL", title: "Clave pública", summary: key ? `Se resolvió ${envelope.payload.keyId}.` : "No existe la clave pública indicada." },
      { id: "SIGNATURE", state: signatureValid ? "PASS" : "FAIL", title: "Firma Ed25519", summary: signatureValid ? "La firma corresponde a los bytes canónicos." : "La firma no corresponde al payload presentado." },
      { id: "CURRENT_STATUS", state: reversed ? "WARN" : "PASS", title: "Estado de sesión", summary: reversed ? "La pestaña simula una reversión; no existe estado persistido." : "El estado temporal coincide con la emisión." }
    ];
    const authentic = integrityValid && signatureValid;
    return {
      result: authentic ? (reversed ? "VERIFIED_REVERSED" : "VERIFIED") : "INVALID_SIGNATURE",
      authentic,
      signatureValid,
      integrityValid,
      verificationId,
      checks,
      artifacts: {
        canonicalPayload: inspectedPayload,
        canonicalBytes: Buffer.byteLength(canonical, "utf8"),
        storedHash: envelope.payloadHash,
        computedHash,
        signature: envelope.signature,
        keyId: envelope.payload.keyId,
        publicKeyFingerprint: key
          ? createHash("sha256").update(key.publicKey, "utf8").digest("hex")
          : null,
        algorithm: "Ed25519"
      },
      receipt: {
        id: envelope.payload.receiptId,
        amountMinor: envelope.payload.amountMinor,
        currency: "COP",
        destinationMasked: envelope.payload.destinationMasked,
        issuedAt: envelope.payload.issuedAt,
        statusAtIssuance: envelope.payload.statusAtIssuance
      },
      transaction: { currentStatus: status }
    };
  }

  private failure(
    result: "NOT_FOUND" | "INVALID_VERIFICATION_TOKEN" | "INVALID_SIGNATURE",
    verificationId: string
  ): VerificationResult {
    return {
      result,
      authentic: false,
      signatureValid: false,
      integrityValid: false,
      verificationId
    };
  }

  private analysisFailure(
    result: "NOT_FOUND" | "INVALID_VERIFICATION_TOKEN",
    verificationId: string,
    failedStage: "RECEIPT_LOOKUP" | "TOKEN"
  ): SecurityLabAnalysis {
    const stages: Array<[SecurityTraceCheck["id"], string]> = [
      ["RECEIPT_LOOKUP", "Evidencia autocontenida"],
      ["TOKEN", "Sobre de verificación"],
      ["CANONICALIZATION", "Payload canónico"],
      ["HASH", "Integridad SHA-256"],
      ["PUBLIC_KEY", "Clave pública"],
      ["SIGNATURE", "Firma Ed25519"],
      ["CURRENT_STATUS", "Estado de sesión"]
    ];
    const failedIndex = stages.findIndex(([id]) => id === failedStage);
    return {
      result,
      authentic: false,
      signatureValid: false,
      integrityValid: false,
      verificationId,
      checks: stages.map(([id, title], index) => ({
        id,
        title,
        state: index === failedIndex ? "FAIL" : "SKIPPED",
        summary:
          index === failedIndex
            ? "La evidencia presentada no supera esta etapa."
            : "Esta etapa no se ejecuta después del fallo anterior."
      }))
    };
  }
}
