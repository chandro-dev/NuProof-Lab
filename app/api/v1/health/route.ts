import { json } from "@/src/lib/http/handler";

export const runtime = "nodejs";

export function GET() {
  return json({ status: "ok", service: "nuproof-lab", version: "v1" });
}
