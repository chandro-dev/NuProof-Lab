import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import { ZodError, z } from "zod";
import { createTransactionSchema, verifyReceiptSchema } from "@nuproof/shared";
import type { AppConfig } from "./config";
import { createDatabase, type AppDatabase } from "./database";
import { loadOrCreateSigningKeys } from "./services/cryptoService";
import { AuditService } from "./services/auditService";
import { TransactionService } from "./services/transactionService";
import { VerificationService } from "./services/verificationService";
import { DemoService } from "./services/demoService";
import { createVerifyRateLimiter } from "./rateLimiter";

const idSchema = z.uuid();
const tamperedVerificationSchema = verifyReceiptSchema
  .extend({ tamperedAmount: z.number().int().positive().max(999_999_999_999) })
  .strict();

export interface AppContext {
  database: AppDatabase;
  transactions: TransactionService;
  verification: VerificationService;
  demo: DemoService;
  audit: AuditService;
}

export function createApp(config: AppConfig, seed = true) {
  const database = createDatabase(config.databasePath);
  const keys = loadOrCreateSigningKeys(config.keysDir);
  const audit = new AuditService(database);
  const transactions = new TransactionService(database, keys, config.keyId, audit);
  const verification = new VerificationService(transactions, keys, audit);
  const demo = new DemoService(database, transactions, audit);
  if (seed) demo.seedIfEmpty();

  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "16kb" }));

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok", service: "NuProof Lab local API" });
  });

  app.get("/api/security/public-key", (_request, response) => {
    response.json({ keyId: config.keyId, algorithm: "Ed25519", publicKey: keys.publicKeyPem });
  });

  app.get("/api/transactions", (_request, response) => {
    response.json({ transactions: transactions.list() });
  });

  app.post("/api/transactions", (request, response) => {
    const input = createTransactionSchema.parse(request.body);
    response.status(201).json({ receipt: transactions.create(input) });
  });

  app.get("/api/transactions/:id", (request, response) => {
    const id = idSchema.parse(request.params.id);
    const receipt = transactions.getByTransactionId(id);
    if (!receipt) {
      response.status(404).json({ error: { code: "TRANSACTION_NOT_FOUND", message: "No encontrada" } });
      return;
    }
    response.json({ receipt });
  });

  app.post("/api/transactions/:id/reverse", (request, response) => {
    const id = idSchema.parse(request.params.id);
    const receipt = transactions.reverse(id);
    if (!receipt) {
      response.status(404).json({ error: { code: "TRANSACTION_NOT_FOUND", message: "No encontrada" } });
      return;
    }
    response.json({ receipt });
  });

  app.post("/api/verify", createVerifyRateLimiter(), (request, response) => {
    const input = verifyReceiptSchema.parse(request.body);
    const result = verification.verify(input);
    const status = result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_TOKEN" ? 403 : 200;
    response.status(status).json(result);
  });

  app.post("/api/lab/verify-tampered", (request, response) => {
    const { tamperedAmount, ...input } = tamperedVerificationSchema.parse(request.body);
    response.json(verification.verifyTamperedAmount(input, tamperedAmount));
  });

  app.get("/api/audit", (_request, response) => {
    response.json({ events: audit.list() });
  });

  app.post("/api/demo/reset", (_request, response) => {
    demo.reset();
    response.json({ reset: true, transactions: transactions.list() });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Solicitud inválida", issues: error.issues }
      });
      return;
    }
    console.error(
      JSON.stringify({
        level: "error",
        message: error instanceof Error ? error.message : "Unknown server error"
      })
    );
    response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Error interno" } });
  };
  app.use(errorHandler);

  const context: AppContext = { database, transactions, verification, demo, audit };
  return { app, context };
}
