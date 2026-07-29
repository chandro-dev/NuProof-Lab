import { z } from "zod";
import { transactionStatuses } from "@/src/domain/model";

export const uuidSchema = z.uuid();
export const verificationTokenSchema = z.string().min(32).max(8_192);
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const createTransactionSchema = z
  .object({
    amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    currency: z.literal("COP").default("COP"),
    recipientAlias: z.string().trim().min(2).max(80),
    destinationMasked: z.string().regex(/^\*{4}\s?\d{4}$/),
    reference: z.string().trim().min(1).max(120)
  })
  .strict();

export const verifyReceiptSchema = z
  .object({
    receiptId: uuidSchema,
    token: verificationTokenSchema
  })
  .strict();

export const updateTransactionStatusSchema = z
  .object({ status: z.enum(transactionStatuses) })
  .strict();

export const tamperReceiptSchema = z
  .object({
    receiptId: uuidSchema,
    token: verificationTokenSchema,
    presentedAmountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
  })
  .strict();

export const analyzeReceiptSchema = z
  .object({
    receiptId: uuidSchema,
    token: verificationTokenSchema,
    presentedAmountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    currentStatus: z.enum(transactionStatuses).optional()
  })
  .strict();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type VerifyReceiptInput = z.infer<typeof verifyReceiptSchema>;

export const statelessIssueSchema = z
  .object({
    transaction: z.object({
      id: uuidSchema,
      amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      currency: z.literal("COP"),
      senderAlias: z.string().min(1).max(80),
      recipientAlias: z.string().min(2).max(80),
      destinationMasked: z.string().regex(/^\*{4}\s?\d{4}$/),
      reference: z.string().min(1).max(120),
      status: z.enum(transactionStatuses),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime()
    })
  })
  .strict();

export interface IssuedReceiptView {
  id: string;
  transactionId: string;
  amountMinor: number;
  currency: "COP";
  recipientAlias: string;
  destinationMasked: string;
  reference: string;
  issuedAt: string;
  statusAtIssuance: string;
  currentStatus: string;
  keyId: string;
  payloadHash: string;
  signature: string;
  verificationToken?: string;
  verificationUrl?: string;
}

export type VerificationResultCode =
  | "VERIFIED"
  | "VERIFIED_REVERSED"
  | "NOT_FOUND"
  | "INVALID_VERIFICATION_TOKEN"
  | "INVALID_SIGNATURE";

export interface VerificationResult {
  result: VerificationResultCode;
  authentic: boolean;
  signatureValid: boolean;
  integrityValid: boolean;
  verificationId: string;
  receipt?: {
    id: string;
    amountMinor: number;
    currency: "COP";
    destinationMasked: string;
    issuedAt: string;
    statusAtIssuance: string;
  };
  transaction?: {
    currentStatus: string;
  };
}

export type SecurityCheckState = "PASS" | "FAIL" | "WARN" | "SKIPPED";

export type SecurityCheckId =
  | "RECEIPT_LOOKUP"
  | "TOKEN"
  | "CANONICALIZATION"
  | "HASH"
  | "PUBLIC_KEY"
  | "SIGNATURE"
  | "CURRENT_STATUS";

export interface SecurityTraceCheck {
  id: SecurityCheckId;
  state: SecurityCheckState;
  title: string;
  summary: string;
}

export interface SecurityLabAnalysis extends VerificationResult {
  checks: SecurityTraceCheck[];
  artifacts?: {
    canonicalPayload: Record<string, unknown>;
    canonicalBytes: number;
    storedHash: string;
    computedHash: string;
    signature: string;
    keyId: string;
    publicKeyFingerprint: string | null;
    algorithm: "Ed25519";
  };
}
