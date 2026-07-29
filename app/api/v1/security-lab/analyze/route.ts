import type { NextRequest } from "next/server";
import { getContainer } from "@/src/infrastructure/container";
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
    const { presentedAmountMinor, ...input } = analyzeReceiptSchema.parse(
      await parseJson(request)
    );
    const result = await getContainer().verification.analyze(input, presentedAmountMinor);
    return json(result, 200, id);
  } catch (error) {
    return handleHttpError(error, id);
  }
}
