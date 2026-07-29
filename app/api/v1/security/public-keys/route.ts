import type { NextRequest } from "next/server";
import { EnvironmentPublicKeyRegistry } from "@/src/infrastructure/crypto/ed25519";
import { handleHttpError, json, requestId } from "@/src/lib/http/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    return json({ keys: await new EnvironmentPublicKeyRegistry().list() }, 200, id);
  } catch (error) {
    return handleHttpError(error, id);
  }
}
