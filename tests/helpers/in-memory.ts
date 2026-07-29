import {
  createHash,
  createHmac,
  generateKeyPairSync,
  sign,
  timingSafeEqual,
  verify
} from "node:crypto";
import type {
  AuditRepository,
  PublicKeyRecord,
  PublicKeyRegistry,
  ReceiptRepository,
  SignatureVerifier,
  SigningProvider,
  TokenDigester,
  TransactionRepository
} from "@/src/domain/ports";
import type {
  AuditEvent,
  Receipt,
  Transaction,
  TransactionStatus
} from "@/src/domain/model";
import { AuditService } from "@/src/application/audit-service";
import { ReceiptService } from "@/src/application/receipt-service";
import { TransactionService } from "@/src/application/transaction-service";
import { VerificationService } from "@/src/application/verification-service";

export class MemoryTransactionRepository implements TransactionRepository {
  public readonly rows = new Map<string, Transaction>();
  public async create(value: Transaction) {
    this.rows.set(value.id, structuredClone(value));
    return structuredClone(value);
  }
  public async findById(id: string) {
    const value = this.rows.get(id);
    return value ? structuredClone(value) : null;
  }
  public async list(limit: number) {
    return [...this.rows.values()].slice(0, limit).map((value) => structuredClone(value));
  }
  public async updateStatus(id: string, status: TransactionStatus, updatedAt: Date) {
    const value = this.rows.get(id);
    if (!value) return null;
    value.status = status;
    value.updatedAt = updatedAt;
    return structuredClone(value);
  }
  public async deleteAll() {
    this.rows.clear();
  }
}

export class MemoryReceiptRepository implements ReceiptRepository {
  public readonly rows = new Map<string, Receipt>();
  public async create(value: Receipt) {
    this.rows.set(value.id, structuredClone(value));
    return structuredClone(value);
  }
  public async findById(id: string) {
    const value = this.rows.get(id);
    return value ? structuredClone(value) : null;
  }
  public async findByTransactionId(transactionId: string) {
    const value = [...this.rows.values()].find((row) => row.transactionId === transactionId);
    return value ? structuredClone(value) : null;
  }
  public async deleteAll() {
    this.rows.clear();
  }
}

class MemoryAuditRepository implements AuditRepository {
  public readonly rows: AuditEvent[] = [];
  public async create(event: AuditEvent) {
    this.rows.push(structuredClone(event));
  }
  public async list(limit: number) {
    return this.rows.slice(-limit).reverse().map((value) => structuredClone(value));
  }
  public async deleteAll() {
    this.rows.length = 0;
  }
}

class TestTokenDigester implements TokenDigester {
  private readonly pepper = "test-pepper-is-at-least-thirty-two-characters";
  public digest(token: string) {
    return createHmac("sha256", this.pepper).update(token).digest("hex");
  }
  public matches(token: string, expectedDigest: string) {
    const actual = Buffer.from(this.digest(token), "hex");
    const expected = Buffer.from(expectedDigest, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}

export function createTestContext() {
  const pair = generateKeyPairSync("ed25519");
  const keyId = "nuproof-test-2026-01";
  const publicKey = pair.publicKey.export({ format: "pem", type: "spki" }).toString();
  const signing: SigningProvider = {
    activeKeyId: () => keyId,
    sign: async (data) => ({
      keyId,
      signature: sign(null, Buffer.from(data), pair.privateKey).toString("base64url")
    })
  };
  const key: PublicKeyRecord = { keyId, algorithm: "Ed25519", publicKey };
  const keys: PublicKeyRegistry = {
    resolve: async (candidate) => (candidate === keyId ? key : null),
    list: async () => [key]
  };
  const verifier: SignatureVerifier = {
    verify: async (data, signature, pem) =>
      verify(null, Buffer.from(data), pem, Buffer.from(signature, "base64url"))
  };
  const transactionsRepository = new MemoryTransactionRepository();
  const receiptsRepository = new MemoryReceiptRepository();
  const auditRepository = new MemoryAuditRepository();
  const audit = new AuditService(auditRepository);
  const transactions = new TransactionService(transactionsRepository, audit);
  const receipts = new ReceiptService(
    transactionsRepository,
    receiptsRepository,
    signing,
    new TestTokenDigester(),
    audit,
    "https://nuproof.test"
  );
  const verification = new VerificationService(
    transactionsRepository,
    receiptsRepository,
    new TestTokenDigester(),
    keys,
    verifier,
    audit
  );
  return {
    transactionsRepository,
    receiptsRepository,
    auditRepository,
    transactions,
    receipts,
    verification,
    pair,
    key,
    digest: (value: string) => createHash("sha256").update(value).digest("hex")
  };
}

export const transactionInput = {
  amountMinor: 25_000_000,
  currency: "COP" as const,
  recipientAlias: "Laura Gómez",
  destinationMasked: "****5832",
  reference: "Pago servicio"
};
