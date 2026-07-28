import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppContext } from "../src/app";
import { baseTransaction, createTestApp } from "./helpers";

describe("verification service", () => {
  let fixture: ReturnType<typeof createTestApp>;
  let context: AppContext;

  beforeEach(() => {
    fixture = createTestApp();
    context = fixture.context;
  });

  afterEach(() => fixture.cleanup());

  it("returns VERIFIED for an authentic receipt", () => {
    const receipt = context.transactions.create(baseTransaction);
    const result = context.verification.verify({
      receiptId: receipt.receiptId,
      verificationToken: receipt.verificationToken
    });
    expect(result).toMatchObject({
      code: "VERIFIED",
      authentic: true,
      signatureValid: true,
      integrityValid: true
    });
  });

  it("returns NOT_FOUND for an unknown receipt", () => {
    const result = context.verification.verify({
      receiptId: "fd649c34-a3d6-4812-8311-a793b87b54dc",
      verificationToken: "a".repeat(32)
    });
    expect(result.code).toBe("NOT_FOUND");
  });

  it("returns INVALID_TOKEN for the wrong bearer token", () => {
    const receipt = context.transactions.create(baseTransaction);
    const result = context.verification.verify({
      receiptId: receipt.receiptId,
      verificationToken: "x".repeat(43)
    });
    expect(result.code).toBe("INVALID_TOKEN");
  });

  it("detects direct SQLite amount tampering", () => {
    const receipt = context.transactions.create(baseTransaction);
    context.database
      .prepare("UPDATE receipts SET amount = 8000000 WHERE receipt_id = ?")
      .run(receipt.receiptId);
    const result = context.verification.verify({
      receiptId: receipt.receiptId,
      verificationToken: receipt.verificationToken
    });
    expect(result.code).toBe("INVALID_SIGNATURE");
  });

  it("keeps the signed snapshot valid while returning current REVERSED status", () => {
    const receipt = context.transactions.create(baseTransaction);
    context.transactions.reverse(receipt.transactionId);
    const result = context.verification.verify({
      receiptId: receipt.receiptId,
      verificationToken: receipt.verificationToken
    });
    expect(result).toMatchObject({
      code: "VERIFIED",
      authentic: true,
      transaction: { amount: 100_000, status: "REVERSED" }
    });
  });
});

