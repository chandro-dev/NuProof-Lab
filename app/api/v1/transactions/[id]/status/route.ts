import type { NextRequest } from "next/server";
import { updateTransactionStatusSchema, uuidSchema } from "@/src/types/contracts";
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestIdentifier = requestId(request);
  try {
    requireDemoAccess(request);
    const id = uuidSchema.parse((await params).id);
    const { status } = updateTransactionStatusSchema.parse(await parseJson(request));
    const transaction = await getContainer().transactions.changeStatus(id, status);
    return json({ transaction }, 200, requestIdentifier);
  } catch (error) {
    return handleHttpError(error, requestIdentifier);
  }
}
