import { json } from "@/src/lib/http/handler";

export const runtime = "nodejs";

export function GET() {
  return json({
    status: "ok",
    service: "nuproof-lab",
    version: "v1",
    capabilities: {
      issuerDemo: process.env.DEMO_MODE === "true" ? "enabled" : "disabled"
    }
  });
}
