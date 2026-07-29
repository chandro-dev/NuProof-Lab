import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const transactionStatus = pgEnum("transaction_status", [
  "PENDING",
  "SETTLED",
  "REVERSED",
  "CANCELLED"
]);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    senderAlias: text("sender_alias").notNull(),
    recipientAlias: text("recipient_alias").notNull(),
    destinationMasked: text("destination_masked").notNull(),
    reference: text("reference").notNull(),
    status: transactionStatus("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull()
  },
  (table) => [
    index("transactions_created_at_idx").on(table.createdAt),
    check("transactions_amount_positive", sql`${table.amountMinor} > 0`),
    check("transactions_currency_cop", sql`${table.currency} = 'COP'`)
  ]
);

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").primaryKey(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    schemaVersion: bigint("schema_version", { mode: "number" }).notNull(),
    issuer: text("issuer").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true, mode: "date" }).notNull(),
    keyId: text("key_id").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    destinationMasked: text("destination_masked").notNull(),
    reference: text("reference").notNull(),
    statusAtIssuance: transactionStatus("status_at_issuance").notNull(),
    payloadHash: text("payload_hash").notNull(),
    signature: text("signature").notNull(),
    verificationTokenHash: text("verification_token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull()
  },
  (table) => [
    uniqueIndex("receipts_transaction_id_idx").on(table.transactionId),
    uniqueIndex("receipts_token_hash_idx").on(table.verificationTokenHash),
    check("receipts_amount_positive", sql`${table.amountMinor} > 0`),
    check("receipts_currency_cop", sql`${table.currency} = 'COP'`),
    check("receipts_schema_v1", sql`${table.schemaVersion} = 1`),
    check("receipts_issuer", sql`${table.issuer} = 'NUPROOF_LAB'`)
  ]
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    eventType: text("event_type").notNull(),
    transactionId: uuid("transaction_id"),
    receiptId: uuid("receipt_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull()
  },
  (table) => [index("audit_events_created_at_idx").on(table.createdAt)]
);
