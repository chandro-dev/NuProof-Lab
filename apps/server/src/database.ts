import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type StatementSync } from "node:sqlite";

const schema = `
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    amount INTEGER NOT NULL CHECK(amount > 0),
    currency TEXT NOT NULL CHECK(currency = 'COP'),
    created_at TEXT NOT NULL,
    sender_alias TEXT NOT NULL,
    recipient_alias TEXT NOT NULL,
    destination_masked TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('PENDING','SETTLED','REVERSED','CANCELLED')),
    reference TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS receipts (
    receipt_id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL UNIQUE REFERENCES transactions(id),
    amount INTEGER NOT NULL CHECK(amount > 0),
    currency TEXT NOT NULL CHECK(currency = 'COP'),
    timestamp TEXT NOT NULL,
    destination_masked TEXT NOT NULL,
    reference TEXT NOT NULL,
    issued_status TEXT NOT NULL,
    verification_token TEXT NOT NULL UNIQUE,
    signature TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    key_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    transaction_id TEXT,
    receipt_id TEXT,
    timestamp TEXT NOT NULL,
    metadata TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events(timestamp DESC);
`;

export class AppDatabase {
  private readonly connection: DatabaseSync;
  private transactionDepth = 0;

  public constructor(filename: string) {
    this.connection = new DatabaseSync(filename);
  }

  public exec(sql: string): void {
    this.connection.exec(sql);
  }

  public prepare(sql: string): StatementSync {
    return this.connection.prepare(sql);
  }

  public close(): void {
    this.connection.close();
  }

  public transaction<T>(operation: () => T): () => T {
    return () => {
      const outermost = this.transactionDepth === 0;
      if (outermost) this.connection.exec("BEGIN IMMEDIATE");
      this.transactionDepth += 1;
      try {
        const result = operation();
        this.transactionDepth -= 1;
        if (outermost) this.connection.exec("COMMIT");
        return result;
      } catch (error) {
        this.transactionDepth -= 1;
        if (outermost) this.connection.exec("ROLLBACK");
        throw error;
      }
    };
  }
}

export function createDatabase(filename: string): AppDatabase {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  const database = new AppDatabase(filename);
  database.exec(schema);
  return database;
}
