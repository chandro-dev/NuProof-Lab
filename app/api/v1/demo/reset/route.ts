import type { NextRequest } from "next/server";
import {
  handleHttpError,
  json,
  requestId,
  requireDemoAccess
} from "@/src/lib/http/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    requireDemoAccess(request);
    return json({ reset: true, records: 0, storage: "session-only" }, 200, id);
  } catch (error) {
    return handleHttpError(error, id);
  }
}
