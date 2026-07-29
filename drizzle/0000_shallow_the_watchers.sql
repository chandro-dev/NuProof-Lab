CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'SETTLED', 'REVERSED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"transaction_id" uuid,
	"receipt_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"transaction_id" uuid NOT NULL,
	"schema_version" bigint NOT NULL,
	"issuer" text NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"key_id" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"destination_masked" text NOT NULL,
	"reference" text NOT NULL,
	"status_at_issuance" "transaction_status" NOT NULL,
	"payload_hash" text NOT NULL,
	"signature" text NOT NULL,
	"verification_token_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "receipts_amount_positive" CHECK ("receipts"."amount_minor" > 0),
	CONSTRAINT "receipts_currency_cop" CHECK ("receipts"."currency" = 'COP'),
	CONSTRAINT "receipts_schema_v1" CHECK ("receipts"."schema_version" = 1),
	CONSTRAINT "receipts_issuer" CHECK ("receipts"."issuer" = 'NUPROOF_LAB')
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"sender_alias" text NOT NULL,
	"recipient_alias" text NOT NULL,
	"destination_masked" text NOT NULL,
	"reference" text NOT NULL,
	"status" "transaction_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "transactions_amount_positive" CHECK ("transactions"."amount_minor" > 0),
	CONSTRAINT "transactions_currency_cop" CHECK ("transactions"."currency" = 'COP')
);
--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_transaction_id_idx" ON "receipts" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_token_hash_idx" ON "receipts" USING btree ("verification_token_hash");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");