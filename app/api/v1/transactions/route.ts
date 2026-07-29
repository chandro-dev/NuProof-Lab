import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createTransactionSchema, paginationSchema } from "@/src/types/contracts";
import {
  handleHttpError,
  json,
  parseJson,
  requestId,
  requireDemoAccess
} from "@/src/lib/http/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    paginationSchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });
    return json({ transactions: [], storage: "session-only" }, 200, id);
  } catch (error) {
    return handleHttpError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    requireDemoAccess(request);
    const input = createTransactionSchema.parse(await parseJson(request));
    const now = new Date();
    const transaction = {
      ...input,
      id: randomUUID(),
      senderAlias: "Cuenta demo",
      status: "SETTLED" as const,
      createdAt: now,
      updatedAt: now
    };
    return json({ transaction }, 201, id);
  } catch (error) {
    return handleHttpError(error, id);
  }
}
