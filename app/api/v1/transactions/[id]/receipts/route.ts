import type { NextRequest } from "next/server";
import { statelessIssueSchema, uuidSchema } from "@/src/types/contracts";
import { getStatelessReceiptService } from "@/src/infrastructure/stateless";
import {
  handleHttpError,
  json,
  parseJson,
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
    const { transaction: serialized } = statelessIssueSchema.parse(await parseJson(request));
    if (serialized.id !== id) {
      return json(
        { error: { code: "TRANSACTION_MISMATCH", message: "La transacción no coincide." } },
        400,
        requestIdentifier
      );
    }
    const receipt = await getStatelessReceiptService().issue({
      ...serialized,
      createdAt: new Date(serialized.createdAt),
      updatedAt: new Date(serialized.updatedAt)
    });
    return json({ receipt }, 201, requestIdentifier);
  } catch (error) {
    return handleHttpError(error, requestIdentifier);
  }
}
