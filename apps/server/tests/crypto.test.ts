import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { CanonicalReceiptPayload } from "@nuproof/shared";
import {
  canonicalizePayload,
  hashPayload,
  signReceipt,
  verifyReceiptSignature
} from "../src/services/cryptoService";

const payload: CanonicalReceiptPayload = {
  version: 1,
  issuer: "NuProof Lab",
  transactionId: "6407e4c5-1c23-4df7-831f-54ed6869c717",
  receiptId: "df63f38b-baa4-43c0-a274-57857a288eb1",
  amount: 100_000,
  currency: "COP",
  timestamp: "2026-07-28T15:42:00.000Z",
  destinationMasked: "**** 5832",
  reference: "Demo",
  issuedStatus: "SETTLED",
  keyId: "nuproof-test-key"
};

describe("receipt cryptography", () => {
  it("produces the same canonical representation and hash", () => {
    expect(canonicalizePayload({ ...payload })).toBe(canonicalizePayload(payload));
    expect(hashPayload(canonicalizePayload(payload))).toHaveLength(64);
  });

  it("verifies the same payload with Ed25519", () => {
    const keys = generateKeyPairSync("ed25519");
    const canonical = canonicalizePayload(payload);
    const signature = signReceipt(canonical, keys.privateKey);
    expect(verifyReceiptSignature(canonical, signature, keys.publicKey)).toBe(true);
  });

  it.each([
    ["amount", { amount: 8_000_000 }],
    ["destination", { destinationMasked: "**** 9999" }],
    ["timestamp", { timestamp: "2026-07-29T15:42:00.000Z" }]
  ])("rejects changed %s", (_name, change) => {
    const keys = generateKeyPairSync("ed25519");
    const signature = signReceipt(canonicalizePayload(payload), keys.privateKey);
    const tampered = { ...payload, ...change };
    expect(verifyReceiptSignature(canonicalizePayload(tampered), signature, keys.publicKey)).toBe(
      false
    );
  });

  it("rejects a wrong public key", () => {
    const signer = generateKeyPairSync("ed25519");
    const attacker = generateKeyPairSync("ed25519");
    const canonical = canonicalizePayload(payload);
    const signature = signReceipt(canonical, signer.privateKey);
    expect(verifyReceiptSignature(canonical, signature, attacker.publicKey)).toBe(false);
  });

  it("rejects the mandatory 100000 to 8000000 manipulation", () => {
    const keys = generateKeyPairSync("ed25519");
    const signedAmount = 100_000;
    const tamperedAmount = 8_000_000;
    const signature = signReceipt(
      canonicalizePayload({ ...payload, amount: signedAmount }),
      keys.privateKey
    );
    expect(
      verifyReceiptSignature(
        canonicalizePayload({ ...payload, amount: tamperedAmount }),
        signature,
        keys.publicKey
      )
    ).toBe(false);
  });
});

