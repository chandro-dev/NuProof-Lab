import { json } from "@/src/lib/http/handler";
import { getPool } from "@/src/infrastructure/database/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DatabaseStatus = "ready" | "missing" | "unreachable" | "migrations_required";
type ConfigurationStatus = "ready" | "missing" | "invalid";

async function databaseStatus(): Promise<DatabaseStatus> {
  if (!process.env.DATABASE_URL) return "missing";
  try {
    const result = await getPool().query<{
      transactions: string | null;
      receipts: string | null;
      auditEvents: string | null;
    }>(
      `select
        to_regclass('public.transactions')::text as transactions,
        to_regclass('public.receipts')::text as receipts,
        to_regclass('public.audit_events')::text as "auditEvents"`
    );
    const row = result.rows[0];
    return row?.transactions && row.receipts && row.auditEvents
      ? "ready"
      : "migrations_required";
  } catch {
    return "unreachable";
  }
}

function signingStatus(): ConfigurationStatus {
  const keyId = process.env.NUPROOF_KEY_ID;
  if (!keyId || !process.env.NUPROOF_PRIVATE_KEY || !process.env.NUPROOF_PUBLIC_KEYS_JSON) {
    return "missing";
  }
  try {
    const keys = JSON.parse(process.env.NUPROOF_PUBLIC_KEYS_JSON) as unknown;
    return Array.isArray(keys) &&
      keys.some(
        (key) =>
          typeof key === "object" &&
          key !== null &&
          "keyId" in key &&
          key.keyId === keyId
      )
      ? "ready"
      : "invalid";
  } catch {
    return "invalid";
  }
}

export async function GET() {
  const database = await databaseStatus();
  const signing = signingStatus();
  const tokenProtection =
    (process.env.NUPROOF_TOKEN_PEPPER?.length ?? 0) >= 32 ? "ready" : "missing";
  const ready =
    database === "ready" && signing === "ready" && tokenProtection === "ready";

  return json({
    status: ready ? "ok" : "degraded",
    service: "nuproof-lab",
    version: "v1",
    capabilities: {
      issuerDemo: process.env.DEMO_MODE === "true" ? "enabled" : "disabled"
    },
    configuration: {
      database,
      signing,
      tokenProtection
    }
  }, ready ? 200 : 503);
}
