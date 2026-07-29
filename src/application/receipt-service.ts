import { randomBytes, randomUUID } from "node:crypto";
import { InvalidTransactionStateError, ReceiptAlreadyIssuedError } from "@/src/domain/errors";
import { buildReceiptPayload, type Receipt } from "@/src/domain/model";
import type {
  AuditWriter,
  ReceiptRepository,
  SigningProvider,
  TokenDigester,
  TransactionRepository
} from "@/src/domain/ports";
import { hashReceipt, receiptBytes } from "@/src/domain/receipt-crypto";
import type { IssuedReceiptView } from "@/src/types/contracts";

export class ReceiptService {
  public constructor(
    private readonly transactions: TransactionRepository,
    private readonly receipts: ReceiptRepository,
    private readonly signing: SigningProvider,
    private readonly tokenDigester: TokenDigester,
    private readonly audit: AuditWriter,
    private readonly appUrl: string
  ) {}

  public async issue(transactionId: string, now = new Date()): Promise<IssuedReceiptView> {
    const transaction = await this.transactions.findById(transactionId);
    if (!transaction) {
      const { TransactionNotFoundError } = await import("@/src/domain/errors");
      throw new TransactionNotFoundError();
    }
    if (transaction.status !== "SETTLED") {
      throw new InvalidTransactionStateError("Receipts can only be issued for settled transactions.");
    }
    if (await this.receipts.findByTransactionId(transactionId)) {
      throw new ReceiptAlreadyIssuedError();
    }

    const token = randomBytes(32).toString("base64url");
    const keyId = this.signing.activeKeyId();
    const unsigned: Receipt = {
      id: randomUUID(),
      transactionId,
      schemaVersion: 1,
      issuer: "NUPROOF_LAB",
      issuedAt: now,
      keyId,
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      destinationMasked: transaction.destinationMasked,
      reference: transaction.reference,
      statusAtIssuance: transaction.status,
      payloadHash: "",
      signature: "",
      verificationTokenHash: this.tokenDigester.digest(token),
      createdAt: now
    };
    const payload = buildReceiptPayload(unsigned);
    const signed = await this.signing.sign(receiptBytes(payload));
    if (signed.keyId !== keyId) throw new Error("Signing provider changed active key during signing");
    const receipt = await this.receipts.create({
      ...unsigned,
      payloadHash: hashReceipt(payload),
      signature: signed.signature
    });
    await this.audit.record("RECEIPT_ISSUED", {
      transactionId,
      receiptId: receipt.id,
      metadata: { schemaVersion: receipt.schemaVersion }
    });
    await this.audit.record("RECEIPT_SIGNED", {
      transactionId,
      receiptId: receipt.id,
      metadata: { keyId, algorithm: "Ed25519" }
    });
    return this.toView(receipt, transaction.recipientAlias, transaction.status, token);
  }

  public async getById(id: string) {
    const receipt = await this.receipts.findById(id);
    if (!receipt) {
      const { ReceiptNotFoundError } = await import("@/src/domain/errors");
      throw new ReceiptNotFoundError();
    }
    const transaction = await this.transactions.findById(receipt.transactionId);
    if (!transaction) throw new Error("Receipt references a missing transaction");
    return this.toView(receipt, transaction.recipientAlias, transaction.status);
  }

  public async getByTransactionId(transactionId: string) {
    const receipt = await this.receipts.findByTransactionId(transactionId);
    return receipt ? this.getById(receipt.id) : null;
  }

  private toView(
    receipt: Receipt,
    recipientAlias: string,
    currentStatus: string,
    token?: string
  ): IssuedReceiptView {
    const view: IssuedReceiptView = {
      id: receipt.id,
      transactionId: receipt.transactionId,
      amountMinor: receipt.amountMinor,
      currency: receipt.currency,
      recipientAlias,
      destinationMasked: receipt.destinationMasked,
      reference: receipt.reference,
      issuedAt: receipt.issuedAt.toISOString(),
      statusAtIssuance: receipt.statusAtIssuance,
      currentStatus,
      keyId: receipt.keyId,
      payloadHash: receipt.payloadHash,
      signature: receipt.signature
    };
    if (token) {
      view.verificationToken = token;
      view.verificationUrl = `${this.appUrl}/verify/${receipt.id}?token=${encodeURIComponent(token)}`;
    }
    return view;
  }
}
