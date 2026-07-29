import { z } from "zod";
import { transactionStatuses } from "./model";

export const receiptEnvelopeSchema = z
  .object({
    version: z.literal(1),
    payload: z.object({
      schemaVersion: z.literal(1),
      issuer: z.literal("NUPROOF_LAB"),
      transactionId: z.uuid(),
      receiptId: z.uuid(),
      amountMinor: z.number().int().positive(),
      currency: z.literal("COP"),
      issuedAt: z.iso.datetime(),
      destinationMasked: z.string(),
      reference: z.string(),
      statusAtIssuance: z.enum(transactionStatuses),
      keyId: z.string()
    }),
    recipientAlias: z.string(),
    payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
    signature: z.string().min(32)
  })
  .strict();

export type ReceiptEnvelope = z.infer<typeof receiptEnvelopeSchema>;

export function decodeReceiptEnvelope(token: string): ReceiptEnvelope {
  const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return receiptEnvelopeSchema.parse(
    JSON.parse(new TextDecoder().decode(bytes)) as unknown
  );
}
