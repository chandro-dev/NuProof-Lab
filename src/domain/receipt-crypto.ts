import { createHash } from "node:crypto";
import type { ReceiptPayload } from "./model";

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

function normalize(value: CanonicalValue): CanonicalValue {
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key] as CanonicalValue)])
    );
  }
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new TypeError("Canonical numeric values must be safe integers");
  }
  return value;
}

export function canonicalizeReceipt(payload: ReceiptPayload): string {
  return JSON.stringify(normalize(payload as unknown as CanonicalValue));
}

export function receiptBytes(payload: ReceiptPayload): Uint8Array {
  return new TextEncoder().encode(canonicalizeReceipt(payload));
}

export function hashReceipt(payload: ReceiptPayload): string {
  return createHash("sha256").update(receiptBytes(payload)).digest("hex");
}
