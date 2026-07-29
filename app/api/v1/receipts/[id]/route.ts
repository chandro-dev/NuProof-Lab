import type { NextRequest } from "next/server";
import { uuidSchema } from "@/src/types/contracts";
import { getContainer } from "@/src/infrastructure/container";
import {
  handleHttpError,
  json,
  requestId,
  requireDemoAccess
} from "@/src/lib/http/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestIdentifier = requestId(request);
  try {
    requireDemoAccess(request);
    const id = uuidSchema.parse((await params).id);
    return json({ receipt: await getContainer().receipts.getById(id) }, 200, requestIdentifier);
  } catch (error) {
    return handleHttpError(error, requestIdentifier);
  }
}
