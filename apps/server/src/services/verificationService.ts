import { randomUUID, timingSafeEqual } from "node:crypto";
import type {
  CanonicalReceiptPayload,
  VerificationCode,
  VerificationResult,
  VerifyReceiptInput
} from "@nuproof/shared";
import type { SigningKeys } from "./cryptoService";
import { canonicalizePayload, hashPayload, verifyReceiptSignature } from "./cryptoService";
import { AuditService } from "./auditService";
import { TransactionService } from "./transactionService";

function tokenMatches(actual: string, candidate: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const candidateBuffer = Buffer.from(candidate);
  return (
    actualBuffer.length === candidateBuffer.length &&
    timingSafeEqual(actualBuffer, candidateBuffer)
  );
}

export class VerificationService {
  public constructor(
    private readonly transactions: TransactionService,
    private readonly keys: SigningKeys,
    private readonly audit: AuditService
  ) {}

  public verify(input: VerifyReceiptInput): VerificationResult {
    const verificationId = randomUUID();
    const receipt = this.transactions.getReceipt(input.receiptId);
    if (!receipt) {
      return this.failure("NOT_FOUND", verificationId, input.receiptId);
    }
    if (!tokenMatches(receipt.verification_token, input.verificationToken)) {
      return this.failure("INVALID_TOKEN", verificationId, input.receiptId);
    }
    const transaction = this.transactions.getTransaction(receipt.transaction_id);
    if (!transaction) {
      return this.failure("NOT_FOUND", verificationId, input.receiptId);
    }
    const payload: CanonicalReceiptPayload = {
      version: 1,
      issuer: "NuProof Lab",
      transactionId: receipt.transaction_id,
      receiptId: receipt.receipt_id,
      amount: receipt.amount,
      currency: receipt.currency,
      timestamp: receipt.timestamp,
      destinationMasked: receipt.destination_masked,
      reference: receipt.reference,
      issuedStatus: receipt.issued_status,
      keyId: receipt.key_id
    };
    const canonical = canonicalizePayload(payload);
    const signatureValid = verifyReceiptSignature(
      canonical,
      receipt.signature,
      this.keys.publicKey
    );
    const integrityValid = hashPayload(canonical) === receipt.payload_hash;
    if (!signatureValid || !integrityValid) {
      return this.failure("INVALID_SIGNATURE", verificationId, input.receiptId);
    }

    this.audit.record("RECEIPT_VERIFIED", {
      transactionId: transaction.id,
      receiptId: receipt.receipt_id,
      metadata: { verificationId, status: transaction.status }
    });
    return {
      code: "VERIFIED",
      authentic: true,
      signatureValid: true,
      integrityValid: true,
      verificationId,
      currentStatusAvailable: true,
      verificationSource: "ONLINE",
      transaction: {
        amount: receipt.amount,
        currency: receipt.currency,
        timestamp: receipt.timestamp,
        destinationMasked: receipt.destination_masked,
        status: transaction.status,
        receiptId: receipt.receipt_id,
        transactionIdSuffix: transaction.id.slice(-8)
      }
    };
  }

  public verifyTamperedAmount(input: VerifyReceiptInput, tamperedAmount: number): VerificationResult {
    const receipt = this.transactions.getReceipt(input.receiptId);
    const verificationId = randomUUID();
    if (!receipt) return this.failure("NOT_FOUND", verificationId, input.receiptId);
    if (!tokenMatches(receipt.verification_token, input.verificationToken)) {
      return this.failure("INVALID_TOKEN", verificationId, input.receiptId);
    }
    const payload: CanonicalReceiptPayload = {
      version: 1,
      issuer: "NuProof Lab",
      transactionId: receipt.transaction_id,
      receiptId: receipt.receipt_id,
      amount: tamperedAmount,
      currency: receipt.currency,
      timestamp: receipt.timestamp,
      destinationMasked: receipt.destination_masked,
      reference: receipt.reference,
      issuedStatus: receipt.issued_status,
      keyId: receipt.key_id
    };
    const signatureValid = verifyReceiptSignature(
      canonicalizePayload(payload),
      receipt.signature,
      this.keys.publicKey
    );
    if (!signatureValid) {
      return this.failure("INVALID_SIGNATURE", verificationId, input.receiptId);
    }
    throw new Error("Tampered payload unexpectedly matched the original signature");
  }

  private failure(
    code: Exclude<VerificationCode, "VERIFIED" | "RATE_LIMITED">,
    verificationId: string,
    receiptId: string
  ): VerificationResult {
    this.audit.record("VERIFICATION_FAILED", {
      receiptId,
      metadata: { verificationId, code }
    });
    return {
      code,
      authentic: false,
      signatureValid: false,
      integrityValid: false,
      verificationId
    };
  }
}
