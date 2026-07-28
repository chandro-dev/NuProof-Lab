import type { AppDatabase } from "../database";
import { AuditService } from "./auditService";
import { TransactionService } from "./transactionService";

const fixtures = [
  {
    amount: 125_000,
    currency: "COP" as const,
    senderAlias: "Cuenta Demo",
    recipientAlias: "Laura Gómez",
    destinationMasked: "**** 5832",
    reference: "Pago almuerzo",
    status: "SETTLED" as const,
    timestamp: "2026-07-28T15:42:00.000Z"
  },
  {
    amount: 850_000,
    currency: "COP" as const,
    senderAlias: "Cuenta Demo",
    recipientAlias: "Mateo Rojas",
    destinationMasked: "**** 1947",
    reference: "Arriendo ficticio",
    status: "SETTLED" as const,
    timestamp: "2026-07-26T19:10:00.000Z"
  },
  {
    amount: 2_500_000,
    currency: "COP" as const,
    senderAlias: "Cuenta Demo",
    recipientAlias: "Sofía Torres",
    destinationMasked: "**** 7741",
    reference: "Servicios de diseño",
    status: "SETTLED" as const,
    timestamp: "2026-07-24T14:05:00.000Z"
  },
  {
    amount: 79_900,
    currency: "COP" as const,
    senderAlias: "Cuenta Demo",
    recipientAlias: "Andrés León",
    destinationMasked: "**** 6204",
    reference: "Compra demo",
    status: "SETTLED" as const,
    timestamp: "2026-07-20T17:30:00.000Z",
    reverse: true
  }
];

export class DemoService {
  public constructor(
    private readonly database: AppDatabase,
    private readonly transactions: TransactionService,
    private readonly audit: AuditService
  ) {}

  public reset(): void {
    this.database.transaction(() => {
      this.database.exec("DELETE FROM audit_events; DELETE FROM receipts; DELETE FROM transactions;");
      for (const fixture of fixtures) {
        const receipt = this.transactions.create(fixture, fixture.timestamp);
        if (fixture.reverse) this.transactions.reverse(receipt.transactionId);
      }
      this.audit.record("DEMO_RESET", { metadata: { fixtureCount: fixtures.length } });
    })();
  }

  public seedIfEmpty(): void {
    const count = this.database.prepare("SELECT COUNT(*) AS count FROM transactions").get() as {
      count: number;
    };
    if (count.count === 0) this.reset();
  }
}

