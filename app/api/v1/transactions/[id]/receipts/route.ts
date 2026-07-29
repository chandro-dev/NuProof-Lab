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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestIdentifier = requestId(request);
  try {
    requireDemoAccess(request);
    const id = uuidSchema.parse((await params).id);
    const receipt = await getContainer().receipts.issue(id);
    return json({ receipt }, 201, requestIdentifier);
  } catch (error) {
    return handleHttpError(error, requestIdentifier);
  }
}
