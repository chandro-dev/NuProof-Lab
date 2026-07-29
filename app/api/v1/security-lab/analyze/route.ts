import type { NextRequest } from "next/server";
import { getStatelessReceiptService } from "@/src/infrastructure/stateless";
import { analyzeReceiptSchema } from "@/src/types/contracts";
import {
  handleHttpError,
  json,
  parseJson,
  requestId,
  requireDemoAccess
} from "@/src/lib/http/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    requireDemoAccess(request);
    const { presentedAmountMinor, currentStatus, ...input } = analyzeReceiptSchema.parse(
      await parseJson(request)
    );
    const result = await getStatelessReceiptService().analyze(
      input,
      presentedAmountMinor,
      currentStatus
    );
    return json(result, 200, id);
  } catch (error) {
    return handleHttpError(error, id);
  }
}
