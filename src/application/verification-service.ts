import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  AuditWriter,
  PublicKeyRegistry,
  ReceiptRepository,
  SignatureVerifier,
  TokenDigester,
  TransactionRepository
} from "@/src/domain/ports";
import { buildReceiptPayload } from "@/src/domain/model";
import { canonicalizeReceipt, hashReceipt, receiptBytes } from "@/src/domain/receipt-crypto";
import type {
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

export class VerificationService {
  public constructor(
    private readonly transactions: TransactionRepository,
    private readonly receipts: ReceiptRepository,
    private readonly tokenDigester: TokenDigester,
    private readonly keys: PublicKeyRegistry,
    private readonly verifier: SignatureVerifier,
    private readonly audit: AuditWriter
  ) {}

  public async verify(input: VerifyReceiptInput): Promise<VerificationResult> {
    const verificationId = randomUUID();
    const receipt = await this.receipts.findById(input.receiptId);
    if (!receipt) return this.failure("NOT_FOUND", verificationId, input.receiptId);
    if (!this.tokenDigester.matches(input.token, receipt.verificationTokenHash)) {
      return this.failure("INVALID_VERIFICATION_TOKEN", verificationId, receipt.id);
    }
    const transaction = await this.transactions.findById(receipt.transactionId);
    if (!transaction) return this.failure("NOT_FOUND", verificationId, receipt.id);

    const payload = buildReceiptPayload(receipt);
    const key = await this.keys.resolve(receipt.keyId);
    const integrityValid = hashesMatch(hashReceipt(payload), receipt.payloadHash);
    const signatureValid =
      key !== null &&
      (await this.verifier.verify(receiptBytes(payload), receipt.signature, key.publicKey));
    if (!integrityValid || !signatureValid) {
      return this.failure("INVALID_SIGNATURE", verificationId, receipt.id);
    }

    const result =
      transaction.status === "REVERSED" ? "VERIFIED_REVERSED" : ("VERIFIED" as const);
    await this.audit.record("RECEIPT_VERIFIED", {
      transactionId: transaction.id,
      receiptId: receipt.id,
      metadata: { verificationId, result, currentStatus: transaction.status }
    });
    return {
      result,
      authentic: true,
      signatureValid: true,
      integrityValid: true,
      verificationId,
      receipt: {
        id: receipt.id,
        amountMinor: receipt.amountMinor,
        currency: receipt.currency,
        destinationMasked: receipt.destinationMasked,
        issuedAt: receipt.issuedAt.toISOString(),
        statusAtIssuance: receipt.statusAtIssuance
      },
      transaction: { currentStatus: transaction.status }
    };
  }

  public async verifyPresentedAmount(
    input: VerifyReceiptInput,
    presentedAmountMinor: number
  ): Promise<VerificationResult> {
    const receipt = await this.receipts.findById(input.receiptId);
    if (!receipt) return this.verify(input);
    const original = receipt.amountMinor;
    receipt.amountMinor = presentedAmountMinor;
    const result = await this.verifyDetachedReceipt(receipt, input, randomUUID());
    receipt.amountMinor = original;
    return result;
  }

  public async analyze(
    input: VerifyReceiptInput,
    presentedAmountMinor?: number
  ): Promise<SecurityLabAnalysis> {
    const verificationId = randomUUID();
    const checks: SecurityTraceCheck[] = [];
    const receipt = await this.receipts.findById(input.receiptId);
    if (!receipt) {
      checks.push({
        id: "RECEIPT_LOOKUP",
        state: "FAIL",
        title: "Registro del emisor",
        summary: "El receiptId no existe en el repositorio."
      });
      return this.analysisFailure("NOT_FOUND", verificationId, checks);
    }
    checks.push({
      id: "RECEIPT_LOOKUP",
      state: "PASS",
      title: "Registro del emisor",
      summary: "El receiptId corresponde a un comprobante persistido."
    });

    if (!this.tokenDigester.matches(input.token, receipt.verificationTokenHash)) {
      checks.push({
        id: "TOKEN",
        state: "FAIL",
        title: "Token de verificación",
        summary: "La comparación HMAC en tiempo constante no coincide."
      });
      return this.analysisFailure("INVALID_VERIFICATION_TOKEN", verificationId, checks);
    }
    checks.push({
      id: "TOKEN",
      state: "PASS",
      title: "Token de verificación",
      summary: "El token presentado coincide con el digest almacenado."
    });

    const transaction = await this.transactions.findById(receipt.transactionId);
    if (!transaction) {
      return this.analysisFailure("NOT_FOUND", verificationId, checks);
    }

    const inspectedReceipt =
      presentedAmountMinor === undefined
        ? receipt
        : { ...receipt, amountMinor: presentedAmountMinor };
    const payload = buildReceiptPayload(inspectedReceipt);
    const canonical = canonicalizeReceipt(payload);
    checks.push({
      id: "CANONICALIZATION",
      state: "PASS",
      title: "Payload canónico",
      summary: `${Buffer.byteLength(canonical, "utf8")} bytes deterministas listos para validar.`
    });

    const computedHash = hashReceipt(payload);
    const integrityValid = hashesMatch(computedHash, receipt.payloadHash);
    checks.push({
      id: "HASH",
      state: integrityValid ? "PASS" : "FAIL",
      title: "Integridad SHA-256",
      summary: integrityValid
        ? "El hash calculado coincide con el hash firmado y almacenado."
        : "El hash calculado cambió: los datos protegidos fueron modificados."
    });

    const key = await this.keys.resolve(receipt.keyId);
    checks.push({
      id: "PUBLIC_KEY",
      state: key ? "PASS" : "FAIL",
      title: "Clave pública",
      summary: key
        ? `El registro resolvió la clave histórica ${receipt.keyId}.`
        : `No existe una clave pública para ${receipt.keyId}.`
    });

    const signatureValid =
      key !== null &&
      (await this.verifier.verify(receiptBytes(payload), receipt.signature, key.publicKey));
    checks.push({
      id: "SIGNATURE",
      state: signatureValid ? "PASS" : "FAIL",
      title: "Firma Ed25519",
      summary: signatureValid
        ? "La firma corresponde exactamente a los bytes canónicos."
        : "La firma no corresponde al payload presentado."
    });

    const reversed = transaction.status === "REVERSED";
    checks.push({
      id: "CURRENT_STATUS",
      state: reversed ? "WARN" : "PASS",
      title: "Estado operativo",
      summary: reversed
        ? "El comprobante es auténtico, pero la operación fue reversada después."
        : `El estado actual es ${transaction.status}.`
    });

    const authentic = integrityValid && signatureValid;
    const result = !authentic
      ? "INVALID_SIGNATURE"
      : reversed
        ? "VERIFIED_REVERSED"
        : "VERIFIED";
    const analysis: SecurityLabAnalysis = {
      result,
      authentic,
      signatureValid,
      integrityValid,
      verificationId,
      checks,
      artifacts: {
        canonicalPayload: payload as unknown as Record<string, unknown>,
        canonicalBytes: Buffer.byteLength(canonical, "utf8"),
        storedHash: receipt.payloadHash,
        computedHash,
        signature: receipt.signature,
        keyId: receipt.keyId,
        publicKeyFingerprint: key
          ? createHash("sha256").update(key.publicKey, "utf8").digest("hex")
          : null,
        algorithm: "Ed25519"
      },
      receipt: {
        id: receipt.id,
        amountMinor: receipt.amountMinor,
        currency: receipt.currency,
        destinationMasked: receipt.destinationMasked,
        issuedAt: receipt.issuedAt.toISOString(),
        statusAtIssuance: receipt.statusAtIssuance
      },
      transaction: { currentStatus: transaction.status }
    };
    return analysis;
  }

  private async verifyDetachedReceipt(
    receipt: Awaited<ReturnType<ReceiptRepository["findById"]>> & {},
    input: VerifyReceiptInput,
    verificationId: string
  ): Promise<VerificationResult> {
    if (!receipt) return this.failure("NOT_FOUND", verificationId, input.receiptId);
    if (!this.tokenDigester.matches(input.token, receipt.verificationTokenHash)) {
      return this.failure("INVALID_VERIFICATION_TOKEN", verificationId, receipt.id);
    }
    const payload = buildReceiptPayload(receipt);
    const key = await this.keys.resolve(receipt.keyId);
    const signatureValid =
      key !== null &&
      (await this.verifier.verify(receiptBytes(payload), receipt.signature, key.publicKey));
    return signatureValid && hashesMatch(hashReceipt(payload), receipt.payloadHash)
      ? this.verify(input)
      : this.failure("INVALID_SIGNATURE", verificationId, receipt.id);
  }

  private async failure(
    result: "NOT_FOUND" | "INVALID_VERIFICATION_TOKEN" | "INVALID_SIGNATURE",
    verificationId: string,
    receiptId: string
  ): Promise<VerificationResult> {
    await this.audit.record("VERIFICATION_FAILED", {
      receiptId,
      metadata: { verificationId, result }
    });
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
    checks: SecurityTraceCheck[]
  ): SecurityLabAnalysis {
    const skippedStages: Array<[SecurityTraceCheck["id"], string]> = [
      ["CANONICALIZATION", "Payload canónico"],
      ["HASH", "Integridad SHA-256"],
      ["PUBLIC_KEY", "Clave pública"],
      ["SIGNATURE", "Firma Ed25519"],
      ["CURRENT_STATUS", "Estado operativo"]
    ];
    const skipped: SecurityTraceCheck[] = skippedStages.map(([id, title]) => ({
      id,
      state: "SKIPPED" as const,
      title,
      summary: "Esta etapa no se ejecuta después del fallo anterior."
    }));
    return {
      result,
      authentic: false,
      signatureValid: false,
      integrityValid: false,
      verificationId,
      checks: [...checks, ...skipped]
    };
  }
}
