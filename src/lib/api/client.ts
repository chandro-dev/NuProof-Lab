import type {
  CreateTransactionInput,
  IssuedReceiptView,
  SecurityLabAnalysis,
  VerificationResult
} from "@/src/types/contracts";
import type { AuditEvent, Transaction, TransactionStatus } from "@/src/domain/model";

export class ApiClientError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  const isJson = response.headers
    .get("content-type")
    ?.toLowerCase()
    .includes("application/json");
  const body = (isJson ? await response.json() : {}) as T & {
    error?: { code?: string; message?: string };
  };
  if (!response.ok) {
    const infrastructureMessage =
      response.status === 403
        ? "Vercel bloqueó la solicitud antes de llegar a la API. Revisa Deployment Protection."
        : "La solicitud no pudo completarse.";
    throw new ApiClientError(
      body.error?.code ?? "REQUEST_FAILED",
      body.error?.message ?? infrastructureMessage,
      response.status
    );
  }
  return body;
}

export async function createTransaction(input: CreateTransactionInput) {
  return (
    await request<{ transaction: Transaction }>("/transactions", {
      method: "POST",
      body: JSON.stringify(input)
    })
  ).transaction;
}

export async function createReceipt(transactionId: string) {
  return (
    await request<{ receipt: IssuedReceiptView }>(
      `/transactions/${transactionId}/receipts`,
      { method: "POST" }
    )
  ).receipt;
}

export async function verifyReceipt(receiptId: string, token: string) {
  return request<VerificationResult>("/verify", {
    method: "POST",
    body: JSON.stringify({ receiptId, token })
  });
}

export async function reverseTransaction(transactionId: string) {
  return (
    await request<{ transaction: Transaction }>(`/transactions/${transactionId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "REVERSED" satisfies TransactionStatus })
    })
  ).transaction;
}

export async function getTransactions() {
  return (await request<{ transactions: Transaction[] }>("/transactions")).transactions;
}

export async function getReceipt(receiptId: string) {
  return (await request<{ receipt: IssuedReceiptView }>(`/receipts/${receiptId}`)).receipt;
}

export async function getAuditEvents() {
  return (await request<{ events: AuditEvent[] }>("/audit")).events;
}

export async function resetDemo() {
  return request<{ reset: true }>("/demo/reset", { method: "POST" });
}

export async function verifyTamperedAmount(
  receiptId: string,
  token: string,
  presentedAmountMinor: number
) {
  return request<VerificationResult>("/security-lab/tamper", {
    method: "POST",
    body: JSON.stringify({ receiptId, token, presentedAmountMinor })
  });
}

export async function analyzeReceiptSecurity(
  receiptId: string,
  token: string,
  presentedAmountMinor?: number
) {
  return request<SecurityLabAnalysis>("/security-lab/analyze", {
    method: "POST",
    body: JSON.stringify({
      receiptId,
      token,
      ...(presentedAmountMinor === undefined ? {} : { presentedAmountMinor })
    })
  });
}
