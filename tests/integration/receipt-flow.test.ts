import { describe, expect, it } from "vitest";
import { createTestContext, transactionInput } from "../helpers/in-memory";

describe("transaction, receipt and verification flow", () => {
  it("creates, issues and verifies through application services", async () => {
    const context = createTestContext();
    const transaction = await context.transactions.create(transactionInput);
    const receipt = await context.receipts.issue(transaction.id);
    const result = await context.verification.verify({
      receiptId: receipt.id,
      token: receipt.verificationToken!
    });
    expect(result).toMatchObject({
      result: "VERIFIED",
      authentic: true,
      signatureValid: true,
      integrityValid: true,
      transaction: { currentStatus: "SETTLED" }
    });
    expect(receipt.verificationToken).toBeDefined();
    expect(context.receiptsRepository.rows.get(receipt.id)?.verificationTokenHash).not.toContain(
      receipt.verificationToken!
    );
  });

  it("returns NOT_FOUND without leaking receipt data", async () => {
    const result = await createTestContext().verification.verify({
      receiptId: "fd649c34-a3d6-4812-8311-a793b87b54dc",
      token: "a".repeat(43)
    });
    expect(result).toMatchObject({ result: "NOT_FOUND", authentic: false });
    expect(result.receipt).toBeUndefined();
  });

  it("rejects the wrong verification token", async () => {
    const context = createTestContext();
    const transaction = await context.transactions.create(transactionInput);
    const receipt = await context.receipts.issue(transaction.id);
    const result = await context.verification.verify({
      receiptId: receipt.id,
      token: "x".repeat(43)
    });
    expect(result.result).toBe("INVALID_VERIFICATION_TOKEN");
  });

  it("keeps an authentic historical receipt after reversal", async () => {
    const context = createTestContext();
    const transaction = await context.transactions.create(transactionInput);
    const receipt = await context.receipts.issue(transaction.id);
    await context.transactions.changeStatus(transaction.id, "REVERSED");
    const result = await context.verification.verify({
      receiptId: receipt.id,
      token: receipt.verificationToken!
    });
    expect(result).toMatchObject({
      result: "VERIFIED_REVERSED",
      authentic: true,
      signatureValid: true,
      receipt: { statusAtIssuance: "SETTLED" },
      transaction: { currentStatus: "REVERSED" }
    });
  });
});
