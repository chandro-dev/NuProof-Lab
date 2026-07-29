export const transactionStatuses = [
  "PENDING",
  "SETTLED",
  "REVERSED",
  "CANCELLED"
] as const;

export type TransactionStatus = (typeof transactionStatuses)[number];

export interface Transaction {
  id: string;
  amountMinor: number;
  currency: "COP";
  senderAlias: string;
  recipientAlias: string;
  destinationMasked: string;
  reference: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptPayload {
  schemaVersion: 1;
  issuer: "NUPROOF_LAB";
  transactionId: string;
  receiptId: string;
  amountMinor: number;
  currency: "COP";
  issuedAt: string;
  destinationMasked: string;
  reference: string;
  statusAtIssuance: TransactionStatus;
  keyId: string;
}

export interface Receipt {
  id: string;
  transactionId: string;
  schemaVersion: 1;
  issuer: "NUPROOF_LAB";
  issuedAt: Date;
  keyId: string;
  amountMinor: number;
  currency: "COP";
  destinationMasked: string;
  reference: string;
  statusAtIssuance: TransactionStatus;
  payloadHash: string;
  signature: string;
  verificationTokenHash: string;
  createdAt: Date;
}

export type AuditEventType =
  | "TRANSACTION_CREATED"
  | "RECEIPT_ISSUED"
  | "RECEIPT_SIGNED"
  | "RECEIPT_VERIFIED"
  | "VERIFICATION_FAILED"
  | "TRANSACTION_REVERSED"
  | "DEMO_RESET";

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  transactionId: string | null;
  receiptId: string | null;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export function buildReceiptPayload(receipt: Receipt): ReceiptPayload {
  return {
    schemaVersion: receipt.schemaVersion,
    issuer: receipt.issuer,
    transactionId: receipt.transactionId,
    receiptId: receipt.id,
    amountMinor: receipt.amountMinor,
    currency: receipt.currency,
    issuedAt: receipt.issuedAt.toISOString(),
    destinationMasked: receipt.destinationMasked,
    reference: receipt.reference,
    statusAtIssuance: receipt.statusAtIssuance,
    keyId: receipt.keyId
  };
}
