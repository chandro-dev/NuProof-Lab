import type { NextRequest } from "next/server";
import { createTransactionSchema, paginationSchema } from "@/src/types/contracts";
import { getContainer } from "@/src/infrastructure/container";
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
    requireDemoAccess(request);
    const { limit } = paginationSchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });
    return json({ transactions: await getContainer().transactions.list(limit) }, 200, id);
  } catch (error) {
    return handleHttpError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    requireDemoAccess(request);
    const input = createTransactionSchema.parse(await parseJson(request));
    const transaction = await getContainer().transactions.create(input);
    return json({ transaction }, 201, id);
  } catch (error) {
    return handleHttpError(error, id);
  }
}
