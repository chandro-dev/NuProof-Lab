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
});
