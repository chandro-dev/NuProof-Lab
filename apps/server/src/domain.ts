import type { TransactionStatus } from "@nuproof/shared";

export interface TransactionRow {
  id: string;
  amount: number;
  currency: "COP";
  created_at: string;
  sender_alias: string;
  recipient_alias: string;
  destination_masked: string;
  status: TransactionStatus;
  reference: string;
  updated_at: string;
}

export interface ReceiptRow {
  receipt_id: string;
  transaction_id: string;
  amount: number;
  currency: "COP";
  timestamp: string;
  destination_masked: string;
  reference: string;
  issued_status: TransactionStatus;
  verification_token: string;
  signature: string;
  payload_hash: string;
  key_id: string;
}

export interface TransactionReceiptRow extends TransactionRow, ReceiptRow {}

