import { randomUUID } from "node:crypto";
import type { AppDatabase } from "../database";

export type AuditEventType =
  | "TRANSACTION_CREATED"
  | "RECEIPT_SIGNED"
  | "RECEIPT_VERIFIED"
  | "VERIFICATION_FAILED"
  | "TRANSACTION_REVERSED"
  | "DEMO_RESET";

export class AuditService {
  public constructor(private readonly database: AppDatabase) {}

  public record(
    eventType: AuditEventType,
    data: {
      transactionId?: string;
      receiptId?: string;
      metadata?: Record<string, string | number | boolean>;
    } = {}
  ): void {
    this.database
      .prepare(
        `INSERT INTO audit_events
         (id, event_type, transaction_id, receipt_id, timestamp, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        eventType,
        data.transactionId ?? null,
        data.receiptId ?? null,
        new Date().toISOString(),
        JSON.stringify(data.metadata ?? {})
      );
  }

  public list(limit = 100): unknown[] {
    return this.database
      .prepare(
        `SELECT id, event_type AS eventType, transaction_id AS transactionId,
          receipt_id AS receiptId, timestamp, metadata
         FROM audit_events ORDER BY timestamp DESC LIMIT ?`
      )
      .all(limit)
      .map((row) => {
        const typed = row as Record<string, unknown>;
        return { ...typed, metadata: JSON.parse(String(typed.metadata)) as unknown };
      });
  }
}

