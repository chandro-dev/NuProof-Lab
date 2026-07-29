import type { NextRequest } from "next/server";
import { getContainer } from "@/src/infrastructure/container";
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
    const { limit } = paginationSchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });
    return json({ events: await getContainer().audit.list(limit) }, 200, id);
  } catch (error) {
    return handleHttpError(error, id);
  }
}
