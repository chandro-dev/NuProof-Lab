import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { DemoModeDisabledError, DomainError, UnauthorizedError } from "@/src/domain/errors";
import { logger } from "@/src/infrastructure/observability/logger";

export function requestId(request: NextRequest): string {
  return request.headers.get("x-request-id")?.slice(0, 100) || randomUUID();
}

export function json(data: unknown, status = 200, id?: string, headers?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers: { ...(id ? { "x-request-id": id } : {}), ...headers }
  });
}

export async function parseJson(request: NextRequest): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 32_768) {
    throw new DomainError("PAYLOAD_TOO_LARGE", "Request body is too large.", 413);
  }
  return request.json();
}

export function requireDemoAccess(request: NextRequest): void {
  if (process.env.DEMO_MODE !== "true") throw new DemoModeDisabledError();
  const configuredKey = process.env.INTERNAL_API_KEY;
  const candidate = request.headers.get("x-internal-api-key");
  if (configuredKey && candidate && constantTimeStringEqual(configuredKey, candidate)) return;

  const expectedOrigin = (process.env.APP_URL ?? request.nextUrl.origin).replace(/\/$/, "");
  const origin = request.headers.get("origin")?.replace(/\/$/, "");
  const referer = request.headers.get("referer");
  const sameSite = request.headers.get("sec-fetch-site") === "same-origin";
  if (
    origin === expectedOrigin ||
    referer?.startsWith(`${expectedOrigin}/`) ||
    sameSite
  ) {
    return;
  }
  throw new UnauthorizedError();
}

function constantTimeStringEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function handleHttpError(error: unknown, id: string): NextResponse {
  if (error instanceof ZodError) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request is invalid.",
          issues: error.issues.map(({ path, message }) => ({ path, message }))
        }
      },
      400,
      id
    );
  }
  if (error instanceof DomainError) {
    return json({ error: { code: error.code, message: error.message } }, error.status, id);
  }
  logger.error("request_failure", {
    requestId: id,
    message: error instanceof Error ? error.message : "Unknown server error"
  });
  return json(
    { error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } },
    500,
    id
  );
}
