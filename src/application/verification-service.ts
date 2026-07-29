import { randomUUID, timingSafeEqual } from "node:crypto";
import type {
  AuditWriter,
  PublicKeyRegistry,
  ReceiptRepository,
  SignatureVerifier,
  TokenDigester,
  TransactionRepository
} from "@/src/domain/ports";
import { buildReceiptPayload } from "@/src/domain/model";
import { hashReceipt, receiptBytes } from "@/src/domain/receipt-crypto";
import type { VerificationResult, VerifyReceiptInput } from "@/src/types/contracts";

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
}
