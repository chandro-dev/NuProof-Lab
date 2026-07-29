import type { NextRequest } from "next/server";
import { updateTransactionStatusSchema, uuidSchema } from "@/src/types/contracts";
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
    uuidSchema.parse((await params).id);
    updateTransactionStatusSchema.parse(await parseJson(request));
    return json(
      {
        error: {
          code: "STATELESS_RESOURCE",
          message: "El estado temporal se modifica únicamente en la sesión del navegador."
        }
      },
      410,
      requestIdentifier
    );
  } catch (error) {
    return handleHttpError(error, requestIdentifier);
  }
}
