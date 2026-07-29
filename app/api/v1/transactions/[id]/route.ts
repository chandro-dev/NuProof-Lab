import type { NextRequest } from "next/server";
import { uuidSchema } from "@/src/types/contracts";
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
    uuidSchema.parse((await params).id);
    return json(
      {
        error: {
          code: "STATELESS_RESOURCE",
          message: "Las transacciones existen únicamente en la sesión del navegador."
        }
      },
      410,
      requestIdentifier
    );
  } catch (error) {
    return handleHttpError(error, requestIdentifier);
  }
}
