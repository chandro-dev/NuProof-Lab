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

let sessionTransactions: Transaction[] = [];
let sessionAuditEvents: AuditEvent[] = [];

export async function createTransaction(input: CreateTransactionInput) {
  const now = new Date();
  const transaction: Transaction = {
    ...input,
    id: crypto.randomUUID(),
    senderAlias: "Cuenta demo",
    status: "SETTLED",
    createdAt: now,
    updatedAt: now
  };
  sessionTransactions = [transaction, ...sessionTransactions];
  sessionAuditEvents = [
    {
      id: crypto.randomUUID(),
      eventType: "TRANSACTION_CREATED",
      transactionId: transaction.id,
      receiptId: null,
      createdAt: now,
      metadata: { mode: "STATELESS" }
    },
    ...sessionAuditEvents
  ];
  return transaction;
}

export async function createReceipt(transaction: Transaction) {
  const receipt = (
    await request<{ receipt: IssuedReceiptView }>(
      `/transactions/${transaction.id}/receipts`,
      {
        method: "POST",
        body: JSON.stringify({
          transaction: {
            ...transaction,
            createdAt: transaction.createdAt.toISOString(),
            updatedAt: transaction.updatedAt.toISOString()
          }
        })
      }
    )
  ).receipt;
  sessionAuditEvents = [
    {
      id: crypto.randomUUID(),
      eventType: "RECEIPT_ISSUED",
      transactionId: transaction.id,
      receiptId: receipt.id,
      createdAt: new Date(),
      metadata: { mode: "STATELESS", keyId: receipt.keyId }
    },
    ...sessionAuditEvents
  ];
  return receipt;
}

export async function verifyReceipt(receiptId: string, token: string) {
  return request<VerificationResult>("/verify", {
    method: "POST",
    body: JSON.stringify({ receiptId, token })
  });
}

export async function reverseTransaction(transactionId: string) {
  const current = sessionTransactions.find((transaction) => transaction.id === transactionId);
  if (!current) throw new Error("La transacción temporal ya no está disponible.");
  const transaction: Transaction = {
    ...current,
    status: "REVERSED" satisfies TransactionStatus,
    updatedAt: new Date()
  };
  sessionTransactions = sessionTransactions.map((candidate) =>
    candidate.id === transactionId ? transaction : candidate
  );
  return transaction;
}

export async function getTransactions() {
  return [...sessionTransactions];
}

export async function getReceipt(receiptId: string) {
  return (await request<{ receipt: IssuedReceiptView }>(`/receipts/${receiptId}`)).receipt;
}

export async function getAuditEvents() {
  return [...sessionAuditEvents];
}

export async function resetDemo() {
  sessionTransactions = [];
  sessionAuditEvents = [];
  return { reset: true as const };
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
  presentedAmountMinor?: number,
  currentStatus?: TransactionStatus
) {
  return request<SecurityLabAnalysis>("/security-lab/analyze", {
    method: "POST",
    body: JSON.stringify({
      receiptId,
      token,
      ...(presentedAmountMinor === undefined ? {} : { presentedAmountMinor }),
      ...(currentStatus === undefined ? {} : { currentStatus })
    })
  });
}
