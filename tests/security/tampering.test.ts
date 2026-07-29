import { describe, expect, it } from "vitest";
import { createTestContext, transactionInput } from "../helpers/in-memory";

describe("security failures", () => {
  it("detects direct persistence tampering", async () => {
    const context = createTestContext();
    const transaction = await context.transactions.create(transactionInput);
    const receipt = await context.receipts.issue(transaction.id);
    context.receiptsRepository.rows.get(receipt.id)!.amountMinor = 250_000_000;
    const result = await context.verification.verify({
      receiptId: receipt.id,
      token: receipt.verificationToken!
    });
    expect(result.result).toBe("INVALID_SIGNATURE");
  });

  it("executes real signature verification for presented-data tampering", async () => {
    const context = createTestContext();
    const transaction = await context.transactions.create(transactionInput);
    const receipt = await context.receipts.issue(transaction.id);
    const result = await context.verification.verifyPresentedAmount(
      { receiptId: receipt.id, token: receipt.verificationToken! },
      250_000_000
    );
    expect(result).toMatchObject({
      result: "INVALID_SIGNATURE",
      signatureValid: false,
      integrityValid: false
    });
  });

  it("reports the exact failed stages in the security trace", async () => {
    const context = createTestContext();
    const transaction = await context.transactions.create(transactionInput);
    const receipt = await context.receipts.issue(transaction.id);
    const analysis = await context.verification.analyze(
      { receiptId: receipt.id, token: receipt.verificationToken! },
      250_000_000
    );

    expect(analysis.result).toBe("INVALID_SIGNATURE");
    expect(analysis.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "RECEIPT_LOOKUP", state: "PASS" }),
        expect.objectContaining({ id: "TOKEN", state: "PASS" }),
        expect.objectContaining({ id: "HASH", state: "FAIL" }),
        expect.objectContaining({ id: "SIGNATURE", state: "FAIL" })
      ])
    );
    expect(analysis.artifacts?.computedHash).not.toBe(analysis.artifacts?.storedHash);
  });

  it("stops the trace before protected evidence when the token is invalid", async () => {
    const context = createTestContext();
    const transaction = await context.transactions.create(transactionInput);
    const receipt = await context.receipts.issue(transaction.id);
    const analysis = await context.verification.analyze({
      receiptId: receipt.id,
      token: "x".repeat(43)
    });

    expect(analysis.result).toBe("INVALID_VERIFICATION_TOKEN");
    expect(analysis.artifacts).toBeUndefined();
    expect(analysis.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "TOKEN", state: "FAIL" }),
        expect.objectContaining({ id: "SIGNATURE", state: "SKIPPED" })
      ])
    );
  });

  it("marks reversal as a warning without invalidating cryptography", async () => {
    const context = createTestContext();
    const transaction = await context.transactions.create(transactionInput);
    const receipt = await context.receipts.issue(transaction.id);
    await context.transactions.changeStatus(transaction.id, "REVERSED");
    const analysis = await context.verification.analyze({
      receiptId: receipt.id,
      token: receipt.verificationToken!
    });

    expect(analysis).toMatchObject({
      result: "VERIFIED_REVERSED",
      authentic: true,
      signatureValid: true,
      integrityValid: true
    });
    expect(analysis.checks).toContainEqual(
      expect.objectContaining({ id: "CURRENT_STATUS", state: "WARN" })
    );
  });
});
