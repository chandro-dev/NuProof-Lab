import type { NextRequest } from "next/server";
import { getContainer } from "@/src/infrastructure/container";
import { handleHttpError, json, requestId } from "@/src/lib/http/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    return json({ keys: await getContainer().keys.list() }, 200, id);
  } catch (error) {
    return handleHttpError(error, id);
  }
}
