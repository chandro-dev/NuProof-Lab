import "server-only";

import { AuditService } from "@/src/application/audit-service";
import { DemoService } from "@/src/application/demo-service";
import { ReceiptService } from "@/src/application/receipt-service";
import { TransactionService } from "@/src/application/transaction-service";
import { VerificationService } from "@/src/application/verification-service";
import {
  EnvironmentPublicKeyRegistry,
  EnvironmentSigningProvider,
  HmacTokenDigester,
  NodeEd25519Verifier
} from "./crypto/ed25519";
import { getDatabase } from "./database/client";
import {
  DrizzleAuditRepository,
  DrizzleReceiptRepository,
  DrizzleTransactionRepository
} from "./database/repositories";
import { InMemoryRateLimitService } from "./security/rate-limit";

function createContainer() {
  const database = getDatabase();
  const transactionRepository = new DrizzleTransactionRepository(database);
  const receiptRepository = new DrizzleReceiptRepository(database);
  const auditRepository = new DrizzleAuditRepository(database);
  const audit = new AuditService(auditRepository);
  const signing = new EnvironmentSigningProvider();
  const tokenDigester = new HmacTokenDigester();
  const keys = new EnvironmentPublicKeyRegistry();
  const transactions = new TransactionService(transactionRepository, audit);
  const receipts = new ReceiptService(
    transactionRepository,
    receiptRepository,
    signing,
    tokenDigester,
    audit,
    (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
  );
  const verification = new VerificationService(
    transactionRepository,
    receiptRepository,
    tokenDigester,
    keys,
    new NodeEd25519Verifier(),
    audit
  );
  const demo = new DemoService(
    transactionRepository,
    receiptRepository,
    auditRepository,
    transactions,
    receipts,
    audit,
    process.env.DEMO_MODE === "true"
  );
  return {
    transactions,
    receipts,
    verification,
    audit,
    demo,
    keys,
    verifyRateLimit: new InMemoryRateLimitService()
  };
}

export type AppContainer = ReturnType<typeof createContainer>;

declare global {
  var __nuproofContainer: AppContainer | undefined;
}

export function getContainer(): AppContainer {
  const container = globalThis.__nuproofContainer ?? createContainer();
  if (process.env.NODE_ENV !== "production") globalThis.__nuproofContainer = container;
  return container;
}
