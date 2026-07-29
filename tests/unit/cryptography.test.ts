import { generateKeyPairSync, sign, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalizeReceipt, hashReceipt, receiptBytes } from "@/src/domain/receipt-crypto";
import type { ReceiptPayload } from "@/src/domain/model";

const payload: ReceiptPayload = {
  schemaVersion: 1,
  issuer: "NUPROOF_LAB",
  transactionId: "6407e4c5-1c23-4df7-831f-54ed6869c717",
  receiptId: "df63f38b-baa4-43c0-a274-57857a288eb1",
  amountMinor: 10_000_000,
  currency: "COP",
  issuedAt: "2026-07-28T15:42:00.000Z",
  destinationMasked: "****5832",
  reference: "Demo",
  statusAtIssuance: "SETTLED",
  keyId: "nuproof-test-key"
};

describe("receipt cryptography", () => {
  it("canonicalizes identical values deterministically", () => {
    const reordered = Object.fromEntries(Object.entries(payload).reverse()) as unknown as ReceiptPayload;
    expect(canonicalizeReceipt(reordered)).toBe(canonicalizeReceipt(payload));
    expect(hashReceipt(payload)).toHaveLength(64);
  });

  it("validates an unchanged Ed25519 payload", () => {
    const keys = generateKeyPairSync("ed25519");
    const signature = sign(null, receiptBytes(payload), keys.privateKey);
    expect(verify(null, receiptBytes(payload), keys.publicKey, signature)).toBe(true);
  });

  it.each([
    ["amount", { amountMinor: 800_000_000 }],
    ["destination", { destinationMasked: "****9999" }],
    ["timestamp", { issuedAt: "2026-07-29T15:42:00.000Z" }]
  ])("rejects a changed %s", (_label, change) => {
    const keys = generateKeyPairSync("ed25519");
    const signature = sign(null, receiptBytes(payload), keys.privateKey);
    expect(
      verify(null, receiptBytes({ ...payload, ...change }), keys.publicKey, signature)
    ).toBe(false);
  });

  it("rejects a wrong public key", () => {
    const signer = generateKeyPairSync("ed25519");
    const attacker = generateKeyPairSync("ed25519");
    const signature = sign(null, receiptBytes(payload), signer.privateKey);
    expect(verify(null, receiptBytes(payload), attacker.publicKey, signature)).toBe(false);
  });
});
