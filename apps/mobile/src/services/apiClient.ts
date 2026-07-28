const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const API_URL = (configuredApiUrl || "http://localhost:3000").replace(/\/$/, "");
const developmentMode = typeof __DEV__ !== "undefined" && __DEV__;

export const STATUS_LOOKUP_ENABLED = Boolean(configuredApiUrl) || developmentMode;

export class ApiError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers }
    });
  } catch {
    throw new ApiError(
      "SERVER_UNAVAILABLE",
      "No fue posible conectar con el servidor local.",
      0
    );
  }
  const body = (await response.json()) as T & {
    error?: { code?: string; message?: string };
  };
  if (!response.ok) {
    throw new ApiError(
      body.error?.code ?? (body as { code?: string }).code ?? "REQUEST_FAILED",
      body.error?.message ?? "La solicitud no pudo completarse.",
      response.status
    );
  }
  return body;
}

export { API_URL };
