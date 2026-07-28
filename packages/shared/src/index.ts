import { z } from "zod";

export const transactionStatuses = ["PENDING", "SETTLED", "REVERSED", "CANCELLED"] as const;
export type TransactionStatus = (typeof transactionStatuses)[number];

export const createTransactionSchema = z
  .object({
    amount: z.number().int().positive().max(999_999_999_999),
    currency: z.literal("COP").default("COP"),
    senderAlias: z.string().trim().min(2).max(80),
    recipientAlias: z.string().trim().min(2).max(80),
    destinationMasked: z.string().regex(/^\*{4}\s?\d{4}$/),
    reference: z.string().trim().min(1).max(120),
    status: z.enum(["PENDING", "SETTLED"]).default("SETTLED")
  })
  .strict();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const verifyReceiptSchema = z
  .object({
    receiptId: z.uuid(),
    verificationToken: z.string().min(32).max(200)
  })
  .strict();

export type VerifyReceiptInput = z.infer<typeof verifyReceiptSchema>;

export const qrPayloadV1Schema = z
  .object({
    type: z.literal("NUPROOF_RECEIPT"),
    version: z.literal(1),
    receiptId: z.uuid(),
    token: z.string().min(32).max(200)
  })
  .strict();

export interface CanonicalReceiptPayload {
  version: 1;
  issuer: "NuProof Lab";
  transactionId: string;
  receiptId: string;
  amount: number;
  currency: "COP";
  timestamp: string;
  destinationMasked: string;
  reference: string;
  issuedStatus: TransactionStatus;
  keyId: string;
}

export const canonicalReceiptPayloadSchema = z
  .object({
    version: z.literal(1),
    issuer: z.literal("NuProof Lab"),
    transactionId: z.uuid(),
    receiptId: z.uuid(),
    amount: z.number().int().positive().max(999_999_999_999),
    currency: z.literal("COP"),
    timestamp: z.iso.datetime(),
    destinationMasked: z.string().regex(/^\*{4}\s?\d{4}$/),
    reference: z.string().min(1).max(120),
    issuedStatus: z.enum(transactionStatuses),
    keyId: z.string().min(3).max(100)
  })
  .strict();

export const qrPayloadV2Schema = z
  .object({
    type: z.literal("NUPROOF_RECEIPT"),
    version: z.literal(2),
    payload: canonicalReceiptPayloadSchema,
    signature: z.string().regex(/^[A-Za-z0-9_-]{80,100}$/),
    payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
    token: z.string().min(32).max(200)
  })
  .strict();

export const qrPayloadSchema = z.discriminatedUnion("version", [
  qrPayloadV1Schema,
  qrPayloadV2Schema
]);

export type QrPayloadV1 = z.infer<typeof qrPayloadV1Schema>;
export type QrPayloadV2 = z.infer<typeof qrPayloadV2Schema>;
export type QrPayload = z.infer<typeof qrPayloadSchema>;

type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

function normalizeCanonicalValue(value: CanonicalJsonValue): CanonicalJsonValue {
  if (Array.isArray(value)) return value.map(normalizeCanonicalValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalizeCanonicalValue(value[key] as CanonicalJsonValue)])
    );
  }
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new Error("Canonical numeric values must be safe integers");
  }
  return value;
}

export function canonicalizeReceiptPayload(payload: CanonicalReceiptPayload): string {
  return JSON.stringify(
    normalizeCanonicalValue(payload as unknown as CanonicalJsonValue)
  );
}

export interface Receipt {
  receiptId: string;
  transactionId: string;
  amount: number;
  currency: "COP";
  timestamp: string;
  senderAlias: string;
  recipientAlias: string;
  destinationMasked: string;
  reference: string;
  issuedStatus: TransactionStatus;
  currentStatus: TransactionStatus;
  verificationToken: string;
  signature: string;
  payloadHash: string;
  keyId: string;
  qrPayload: QrPayload;
}

export type VerificationCode =
  | "VERIFIED"
  | "NOT_FOUND"
  | "INVALID_TOKEN"
  | "INVALID_SIGNATURE"
  | "RATE_LIMITED";

export interface VerificationResult {
  code: VerificationCode;
  authentic: boolean;
  signatureValid: boolean;
  integrityValid: boolean;
  verificationId: string;
  currentStatusAvailable?: boolean;
  verificationSource?: "ONLINE" | "PORTABLE_QR";
  statusLookupCode?: VerificationCode | "SERVER_UNAVAILABLE";
  transaction?: {
    amount: number;
    currency: "COP";
    timestamp: string;
    destinationMasked: string;
    status: TransactionStatus;
    receiptId: string;
    transactionIdSuffix: string;
  };
}
