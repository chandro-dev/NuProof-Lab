interface RequestOriginSource {
  headers: Headers;
  nextUrl: { origin: string };
}

export function normalizeOrigin(value?: string | null): string | undefined {
  if (!value) return undefined;
  const candidate = value.includes("://") ? value : `https://${value}`;
  try {
    return new URL(candidate).origin;
  } catch {
    return undefined;
  }
}

export function getCanonicalAppUrl(
  environment: Readonly<Record<string, string | undefined>> = process.env
): string {
  const vercelProductionUrl = normalizeOrigin(
    environment.VERCEL_PROJECT_PRODUCTION_URL
  );
  const configuredUrl = normalizeOrigin(environment.APP_URL);
  const deploymentUrl = normalizeOrigin(environment.VERCEL_URL);

  return (
    vercelProductionUrl ??
    configuredUrl ??
    deploymentUrl ??
    "http://localhost:3000"
  );
}

export function getRequestOrigin(request: RequestOriginSource): string {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",", 1)[0]
    ?.trim();
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",", 1)[0]
    ?.trim();
  const forwardedOrigin =
    forwardedHost && forwardedProtocol
      ? normalizeOrigin(`${forwardedProtocol}://${forwardedHost}`)
      : undefined;

  return forwardedOrigin ?? normalizeOrigin(request.nextUrl.origin) ?? request.nextUrl.origin;
}

export function isAllowedRequestOrigin(
  request: RequestOriginSource,
  canonicalAppUrl = getCanonicalAppUrl()
): boolean {
  const allowedOrigins = new Set([
    getRequestOrigin(request),
    normalizeOrigin(canonicalAppUrl)
  ]);
  const origin = normalizeOrigin(request.headers.get("origin"));
  const refererOrigin = normalizeOrigin(request.headers.get("referer"));

  if (origin || refererOrigin) {
    return Boolean(
      (origin && allowedOrigins.has(origin)) ||
        (refererOrigin && allowedOrigins.has(refererOrigin))
    );
  }

  return request.headers.get("sec-fetch-site") === "same-origin";
}
