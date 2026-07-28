import { randomBytes, randomUUID } from "node:crypto";
import type {
  CanonicalReceiptPayload,
  CreateTransactionInput,
  QrPayload,
  Receipt
} from "@nuproof/shared";
import type { AppDatabase } from "../database";
import type { ReceiptRow, TransactionReceiptRow, TransactionRow } from "../domain";
import type { SigningKeys } from "./cryptoService";
import { canonicalizePayload, hashPayload, signReceipt } from "./cryptoService";
import { AuditService } from "./auditService";

export class TransactionService {
  public constructor(
    private readonly database: AppDatabase,
    private readonly keys: SigningKeys,
    private readonly keyId: string,
    private readonly audit: AuditService
  ) {}

  public create(input: CreateTransactionInput, timestamp = new Date().toISOString()): Receipt {
    const transactionId = randomUUID();
    const receiptId = randomUUID();
    const verificationToken = randomBytes(32).toString("base64url");
    const payload: CanonicalReceiptPayload = {
      version: 1,
      issuer: "NuProof Lab",
      transactionId,
      receiptId,
      amount: input.amount,
      currency: input.currency,
      timestamp,
      destinationMasked: input.destinationMasked,
      reference: input.reference,
      issuedStatus: input.status,
      keyId: this.keyId
    };
    const canonical = canonicalizePayload(payload);
    const signature = signReceipt(canonical, this.keys.privateKey);
    const payloadHash = hashPayload(canonical);

    this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO transactions
           (id, amount, currency, created_at, sender_alias, recipient_alias,
            destination_masked, status, reference, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          transactionId,
          input.amount,
          input.currency,
          timestamp,
          input.senderAlias,
          input.recipientAlias,
          input.destinationMasked,
          input.status,
          input.reference,
          timestamp
        );
      this.database
        .prepare(
          `INSERT INTO receipts
           (receipt_id, transaction_id, amount, currency, timestamp,
            destination_masked, reference, issued_status, verification_token,
            signature, payload_hash, key_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          receiptId,
          transactionId,
          input.amount,
          input.currency,
          timestamp,
          input.destinationMasked,
          input.reference,
          input.status,
          verificationToken,
          signature,
          payloadHash,
          this.keyId
        );
      this.audit.record("TRANSACTION_CREATED", { transactionId, receiptId });
      this.audit.record("RECEIPT_SIGNED", {
        transactionId,
        receiptId,
        metadata: { keyId: this.keyId, algorithm: "Ed25519" }
      });
    })();

    return this.getByTransactionId(transactionId) as Receipt;
  }

  public list(): Receipt[] {
    return (
      this.database
        .prepare(
          `SELECT t.*, r.* FROM transactions t
           JOIN receipts r ON r.transaction_id = t.id
           ORDER BY t.created_at DESC`
        )
        .all() as unknown as TransactionReceiptRow[]
    ).map((row) => this.toReceipt(row));
  }

  public getByTransactionId(id: string): Receipt | undefined {
    const row = this.database
      .prepare(
        `SELECT t.*, r.* FROM transactions t
         JOIN receipts r ON r.transaction_id = t.id WHERE t.id = ?`
      )
      .get(id) as TransactionReceiptRow | undefined;
    return row ? this.toReceipt(row) : undefined;
  }

  public getTransaction(id: string): TransactionRow | undefined {
    return this.database.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as
      | TransactionRow
      | undefined;
  }

  public getReceipt(receiptId: string): ReceiptRow | undefined {
    return this.database.prepare("SELECT * FROM receipts WHERE receipt_id = ?").get(receiptId) as
      | ReceiptRow
      | undefined;
  }

  public reverse(id: string): Receipt | undefined {
    const existing = this.getByTransactionId(id);
    if (!existing) return undefined;
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.database
        .prepare("UPDATE transactions SET status = 'REVERSED', updated_at = ? WHERE id = ?")
        .run(now, id);
      this.audit.record("TRANSACTION_REVERSED", {
        transactionId: id,
        receiptId: existing.receiptId
      });
    })();
    return this.getByTransactionId(id);
  }

  private toReceipt(row: TransactionReceiptRow): Receipt {
    const qrPayload: QrPayload = {
      type: "NUPROOF_RECEIPT",
      version: 1,
      receiptId: row.receipt_id,
      token: row.verification_token
    };
    return {
      receiptId: row.receipt_id,
      transactionId: row.id,
      amount: row.amount,
      currency: row.currency,
      timestamp: row.timestamp,
      senderAlias: row.sender_alias,
      recipientAlias: row.recipient_alias,
      destinationMasked: row.destination_masked,
      reference: row.reference,
      issuedStatus: row.issued_status,
      currentStatus: row.status,
      verificationToken: row.verification_token,
      signature: row.signature,
      payloadHash: row.payload_hash,
      keyId: row.key_id,
      qrPayload
    };
  }
}
