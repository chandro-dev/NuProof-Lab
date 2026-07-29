import "server-only";

import { desc, eq } from "drizzle-orm";
import type {
  AuditRepository,
  ReceiptRepository,
  TransactionRepository
} from "@/src/domain/ports";
import type {
  AuditEvent,
  AuditEventType,
  Receipt,
  Transaction,
  TransactionStatus
} from "@/src/domain/model";
import type { Database } from "./client";
import { auditEvents, receipts, transactions } from "./schema";

export class DrizzleTransactionRepository implements TransactionRepository {
  public constructor(private readonly db: Database) {}

  public async create(transaction: Transaction): Promise<Transaction> {
    const [created] = await this.db.insert(transactions).values(transaction).returning();
    if (!created) throw new Error("Transaction insert returned no row");
    return created as Transaction;
  }

  public async findById(id: string): Promise<Transaction | null> {
    const [row] = await this.db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    return (row as Transaction | undefined) ?? null;
  }

  public async list(limit: number): Promise<Transaction[]> {
    return (await this.db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)) as Transaction[];
  }

  public async updateStatus(
    id: string,
    status: TransactionStatus,
    updatedAt: Date
  ): Promise<Transaction | null> {
    const [row] = await this.db
      .update(transactions)
      .set({ status, updatedAt })
      .where(eq(transactions.id, id))
      .returning();
    return (row as Transaction | undefined) ?? null;
  }

  public async deleteAll(): Promise<void> {
    await this.db.delete(transactions);
  }
}

export class DrizzleReceiptRepository implements ReceiptRepository {
  public constructor(private readonly db: Database) {}

  public async create(receipt: Receipt): Promise<Receipt> {
    const [created] = await this.db.insert(receipts).values(receipt).returning();
    if (!created) throw new Error("Receipt insert returned no row");
    return created as Receipt;
  }

  public async findById(id: string): Promise<Receipt | null> {
    const [row] = await this.db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
    return (row as Receipt | undefined) ?? null;
  }

  public async findByTransactionId(transactionId: string): Promise<Receipt | null> {
    const [row] = await this.db
      .select()
      .from(receipts)
      .where(eq(receipts.transactionId, transactionId))
      .limit(1);
    return (row as Receipt | undefined) ?? null;
  }

  public async deleteAll(): Promise<void> {
    await this.db.delete(receipts);
  }
}

export class DrizzleAuditRepository implements AuditRepository {
  public constructor(private readonly db: Database) {}

  public async create(event: AuditEvent): Promise<void> {
    await this.db.insert(auditEvents).values(event);
  }

  public async list(limit: number): Promise<AuditEvent[]> {
    const rows = await this.db
      .select()
      .from(auditEvents)
      .orderBy(desc(auditEvents.createdAt))
      .limit(limit);
    return rows.map((row) => ({ ...row, eventType: row.eventType as AuditEventType }));
  }

  public async deleteAll(): Promise<void> {
    await this.db.delete(auditEvents);
  }
}
