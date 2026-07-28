import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config";

export function createTestApp() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nuproof-test-"));
  const config: AppConfig = {
    port: 0,
    host: "127.0.0.1",
    databasePath: path.join(directory, "test.sqlite"),
    keysDir: path.join(directory, "keys"),
    keyId: "nuproof-test-key-01"
  };
  const result = createApp(config, false);
  return {
    ...result,
    config,
    cleanup(): void {
      result.context.database.close();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  };
}

export const baseTransaction = {
  amount: 100_000,
  currency: "COP" as const,
  senderAlias: "Emisor ficticio",
  recipientAlias: "Laura Gómez",
  destinationMasked: "**** 5832",
  reference: "Prueba criptográfica",
  status: "SETTLED" as const
};

