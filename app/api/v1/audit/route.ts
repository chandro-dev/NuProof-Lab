import type { NextRequest } from "next/server";
import { paginationSchema } from "@/src/types/contracts";
import {
  handleHttpError,
  json,
  requestId,
  requireDemoAccess
} from "@/src/lib/http/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    requireDemoAccess(request);
    paginationSchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });
    return json({ events: [], storage: "session-only" }, 200, id);
  } catch (error) {
    return handleHttpError(error, id);
  }
}
