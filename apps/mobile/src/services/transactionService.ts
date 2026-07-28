import type { CreateTransactionInput, Receipt } from "@nuproof/shared";
import { apiRequest } from "./apiClient";
import type { AuditEvent } from "@/types";

export async function listTransactions(): Promise<Receipt[]> {
  const result = await apiRequest<{ transactions: Receipt[] }>("/api/transactions");
  return result.transactions;
}

export async function createTransaction(input: CreateTransactionInput): Promise<Receipt> {
  const result = await apiRequest<{ receipt: Receipt }>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return result.receipt;
}

export async function reverseTransaction(transactionId: string): Promise<Receipt> {
  const result = await apiRequest<{ receipt: Receipt }>(
    `/api/transactions/${transactionId}/reverse`,
    { method: "POST" }
  );
  return result.receipt;
}

export async function resetDemo(): Promise<Receipt[]> {
  const result = await apiRequest<{ transactions: Receipt[] }>("/api/demo/reset", {
    method: "POST"
  });
  return result.transactions;
}

export async function listAuditEvents(): Promise<AuditEvent[]> {
  const result = await apiRequest<{ events: AuditEvent[] }>("/api/audit");
  return result.events;
}
