import type { AuditEvent, AuditEventType, Receipt, Transaction, TransactionStatus } from "./model";

export interface TransactionRepository {
  create(transaction: Transaction): Promise<Transaction>;
  findById(id: string): Promise<Transaction | null>;
  list(limit: number): Promise<Transaction[]>;
  updateStatus(id: string, status: TransactionStatus, updatedAt: Date): Promise<Transaction | null>;
  deleteAll(): Promise<void>;
}

export interface ReceiptRepository {
  create(receipt: Receipt): Promise<Receipt>;
  findById(id: string): Promise<Receipt | null>;
  findByTransactionId(transactionId: string): Promise<Receipt | null>;
  deleteAll(): Promise<void>;
}

export interface AuditRepository {
  create(event: AuditEvent): Promise<void>;
  list(limit: number): Promise<AuditEvent[]>;
  deleteAll(): Promise<void>;
}

export interface SignatureResult {
  keyId: string;
  signature: string;
}

export interface SigningProvider {
  sign(data: Uint8Array): Promise<SignatureResult>;
}

export interface PublicKeyRecord {
  keyId: string;
  algorithm: "Ed25519";
  publicKey: string;
}

export interface PublicKeyRegistry {
  resolve(keyId: string): Promise<PublicKeyRecord | null>;
  list(): Promise<PublicKeyRecord[]>;
}

export interface SignatureVerifier {
  verify(data: Uint8Array, signature: string, publicKeyPem: string): Promise<boolean>;
}

export interface TokenDigester {
  digest(token: string): string;
  matches(token: string, expectedDigest: string): boolean;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitService {
  consume(key: string): Promise<RateLimitDecision>;
}

export interface StructuredLogger {
  info(event: string, context: Record<string, unknown>): void;
  error(event: string, context: Record<string, unknown>): void;
}

export interface AuditWriter {
  record(
    eventType: AuditEventType,
    data?: {
      transactionId?: string;
      receiptId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void>;
}
