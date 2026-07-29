import { randomUUID } from "node:crypto";
import type { AuditWriter, AuditRepository } from "@/src/domain/ports";
import type { AuditEventType } from "@/src/domain/model";

export class AuditService implements AuditWriter {
  public constructor(private readonly repository: AuditRepository) {}

  public async record(
    eventType: AuditEventType,
    data: {
      transactionId?: string;
      receiptId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    await this.repository.create({
      id: randomUUID(),
      eventType,
      transactionId: data.transactionId ?? null,
      receiptId: data.receiptId ?? null,
      createdAt: new Date(),
      metadata: data.metadata ?? {}
    });
  }

  public list(limit = 50) {
    return this.repository.list(limit);
  }
}
