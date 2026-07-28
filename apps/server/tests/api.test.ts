import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { baseTransaction, createTestApp } from "./helpers";

describe("REST API", () => {
  let fixture: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    fixture = createTestApp();
  });

  afterEach(() => fixture.cleanup());

  it("creates and verifies a receipt", async () => {
    const created = await request(fixture.app)
      .post("/api/transactions")
      .send(baseTransaction)
      .expect(201);
    const receipt = created.body.receipt as {
      receiptId: string;
      verificationToken: string;
    };
    const verified = await request(fixture.app)
      .post("/api/verify")
      .send({ receiptId: receipt.receiptId, verificationToken: receipt.verificationToken })
      .expect(200);
    expect(verified.body).toMatchObject({ code: "VERIFIED", authentic: true });
  });

  it("rejects unexpected and malformed input", async () => {
    const response = await request(fixture.app)
      .post("/api/transactions")
      .send({ ...baseTransaction, amount: 10.5, accountNumber: "123456" })
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("exposes only the public key", async () => {
    const response = await request(fixture.app).get("/api/security/public-key").expect(200);
    expect(response.body.algorithm).toBe("Ed25519");
    expect(response.body.publicKey).toContain("PUBLIC KEY");
    expect(JSON.stringify(response.body)).not.toContain("PRIVATE KEY");
  });

  it("returns not found without internal details", async () => {
    const response = await request(fixture.app)
      .post("/api/verify")
      .send({
        receiptId: "fd649c34-a3d6-4812-8311-a793b87b54dc",
        verificationToken: "a".repeat(32)
      })
      .expect(404);
    expect(response.body.code).toBe("NOT_FOUND");
  });

  it("resets deterministic demo fixtures without replacing the key", async () => {
    const before = await request(fixture.app).get("/api/security/public-key").expect(200);
    const reset = await request(fixture.app).post("/api/demo/reset").expect(200);
    const after = await request(fixture.app).get("/api/security/public-key").expect(200);
    expect(reset.body.transactions).toHaveLength(4);
    expect(after.body.publicKey).toBe(before.body.publicKey);
  });

  it("cryptographically rejects a tampered amount through the security lab", async () => {
    const created = await request(fixture.app)
      .post("/api/transactions")
      .send(baseTransaction)
      .expect(201);
    const receipt = created.body.receipt as {
      receiptId: string;
      verificationToken: string;
    };
    const response = await request(fixture.app)
      .post("/api/lab/verify-tampered")
      .send({
        receiptId: receipt.receiptId,
        verificationToken: receipt.verificationToken,
        tamperedAmount: 8_000_000
      })
      .expect(200);
    expect(response.body).toMatchObject({
      code: "INVALID_SIGNATURE",
      signatureValid: false,
      integrityValid: false
    });
  });
});
