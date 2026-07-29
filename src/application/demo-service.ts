import { DemoModeDisabledError } from "@/src/domain/errors";
import type { AuditRepository, ReceiptRepository, TransactionRepository } from "@/src/domain/ports";
import type { CreateTransactionInput } from "@/src/types/contracts";
import { AuditService } from "./audit-service";
import { ReceiptService } from "./receipt-service";
import { TransactionService } from "./transaction-service";

const fixtures: CreateTransactionInput[] = [
  {
    amountMinor: 12_500_000,
    currency: "COP",
    recipientAlias: "Laura Gómez",
    destinationMasked: "****5832",
    reference: "Pago de servicios"
  },
  {
    amountMinor: 25_000_000,
    currency: "COP",
    recipientAlias: "Carlos Martínez",
    destinationMasked: "****1947",
    reference: "Arriendo ficticio"
  },
  {
    amountMinor: 85_000_000,
    currency: "COP",
    recipientAlias: "Andrea Torres",
    destinationMasked: "****7741",
    reference: "Servicios de diseño"
  }
];

export class DemoService {
  public constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly receiptRepository: ReceiptRepository,
    private readonly auditRepository: AuditRepository,
    private readonly transactions: TransactionService,
    private readonly receipts: ReceiptService,
    private readonly audit: AuditService,
    private readonly enabled: boolean
  ) {}

  public async reset() {
    if (!this.enabled) throw new DemoModeDisabledError();
    await this.auditRepository.deleteAll();
    await this.receiptRepository.deleteAll();
    await this.transactionRepository.deleteAll();
    const created = [];
    for (const fixture of fixtures) {
      const transaction = await this.transactions.create(fixture);
      const receipt = await this.receipts.issue(transaction.id);
      created.push({ transaction, receipt });
    }
    await this.audit.record("DEMO_RESET", { metadata: { fixtureCount: created.length } });
    return created;
  }
}
