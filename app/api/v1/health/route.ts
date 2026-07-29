import { json } from "@/src/lib/http/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConfigurationStatus = "ready" | "missing" | "invalid";

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
  const signing = signingStatus();
  const ready = signing === "ready";

  return json({
    status: ready ? "ok" : "degraded",
    service: "nuproof-lab",
    version: "v1",
    capabilities: {
      issuerDemo: process.env.DEMO_MODE === "true" ? "enabled" : "disabled"
    },
    configuration: {
      storage: "stateless",
      persistence: "disabled",
      signing
    }
  }, ready ? 200 : 503);
}
