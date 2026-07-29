import type { NextRequest } from "next/server";
import { getContainer } from "@/src/infrastructure/container";
import { logger } from "@/src/infrastructure/observability/logger";
import { verifyReceiptSchema } from "@/src/types/contracts";
import { handleHttpError, json, parseJson, requestId } from "@/src/lib/http/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const client =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const limiter = await getContainer().verifyRateLimit.consume(client);
    const rateHeaders = {
      "RateLimit-Limit": String(limiter.limit),
      "RateLimit-Remaining": String(limiter.remaining)
    };
    if (!limiter.allowed) {
      logger.info("rate_limited", { requestId: id, client });
      return json(
        { error: { code: "RATE_LIMITED", message: "Too many verification attempts." } },
        429,
        id,
        { ...rateHeaders, "Retry-After": String(limiter.retryAfterSeconds) }
      );
    }
    const input = verifyReceiptSchema.parse(await parseJson(request));
    const result = await getContainer().verification.verify(input);
    logger.info(result.authentic ? "verification_success" : "verification_failure", {
      requestId: id,
      verificationId: result.verificationId,
      result: result.result
    });
    return json(result, 200, id, rateHeaders);
  } catch (error) {
    return handleHttpError(error, id);
  }
}
