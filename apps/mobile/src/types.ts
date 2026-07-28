export type { Receipt, VerificationResult, TransactionStatus, QrPayload } from "@nuproof/shared";

export interface AuditEvent {
  id: string;
  eventType: string;
  transactionId?: string;
  receiptId?: string;
  timestamp: string;
  metadata: Record<string, string | number | boolean>;
}

export interface VerificationHistoryEntry {
  id: string;
  code: "VERIFIED" | "REVERSED" | "INVALID";
  receiptId: string;
  timestamp: string;
}

