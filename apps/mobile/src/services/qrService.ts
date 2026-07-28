import { qrPayloadSchema, type QrPayload } from "@nuproof/shared";

export function encodeQrPayload(payload: QrPayload): string {
  return JSON.stringify(payload);
}

export function parseQrPayload(raw: string): QrPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("INVALID_QR");
  }
  const result = qrPayloadSchema.safeParse(parsed);
  if (!result.success) throw new Error("INVALID_QR");
  return result.data;
}

