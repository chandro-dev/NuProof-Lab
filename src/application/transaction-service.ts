import { randomUUID } from "node:crypto";
import {
  InvalidTransactionStateError,
  TransactionNotFoundError
} from "@/src/domain/errors";
import type { AuditWriter, TransactionRepository } from "@/src/domain/ports";
import type { CreateTransactionInput } from "@/src/types/contracts";
import type { TransactionStatus } from "@/src/domain/model";

export class TransactionService {
  public constructor(
    private readonly transactions: TransactionRepository,
    private readonly audit: AuditWriter
  ) {}

  public async create(input: CreateTransactionInput, now = new Date()) {
    const transaction = await this.transactions.create({
      id: randomUUID(),
      amountMinor: input.amountMinor,
      currency: input.currency,
      senderAlias: "Cuenta Demo",
      recipientAlias: input.recipientAlias,
      destinationMasked: input.destinationMasked,
      reference: input.reference,
      status: "SETTLED",
      createdAt: now,
      updatedAt: now
    });
    await this.audit.record("TRANSACTION_CREATED", {
      transactionId: transaction.id,
      metadata: { amountMinor: transaction.amountMinor, currency: transaction.currency }
    });
    return transaction;
  }

  public async get(id: string) {
    const transaction = await this.transactions.findById(id);
    if (!transaction) throw new TransactionNotFoundError();
    return transaction;
  }

  public list(limit = 50) {
    return this.transactions.list(limit);
  }

  public async changeStatus(id: string, status: TransactionStatus) {
    const current = await this.get(id);
    if (current.status === "CANCELLED" || current.status === "REVERSED") {
      throw new InvalidTransactionStateError("A terminal transaction cannot change status.");
    }
    if (status !== "REVERSED" && status !== "CANCELLED") {
      throw new InvalidTransactionStateError("Only reversal or cancellation is allowed.");
    }
    const updated = await this.transactions.updateStatus(id, status, new Date());
    if (!updated) throw new TransactionNotFoundError();
    if (status === "REVERSED") {
      await this.audit.record("TRANSACTION_REVERSED", { transactionId: id });
    }
    return updated;
  }
}
