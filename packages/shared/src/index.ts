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

export const qrPayloadSchema = z
  .object({
    type: z.literal("NUPROOF_RECEIPT"),
    version: z.literal(1),
    receiptId: z.uuid(),
    token: z.string().min(32).max(200)
  })
  .strict();

export type QrPayload = z.infer<typeof qrPayloadSchema>;

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

