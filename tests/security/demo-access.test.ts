import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isAllowedRequestOrigin } from "@/src/lib/app-url";

describe("demo route origin access", () => {
  it("allows the active Vercel preview origin", () => {
    const request = new NextRequest(
      "https://nuproof-preview.vercel.app/api/v1/transactions",
      {
        method: "POST",
        headers: {
          origin: "https://nuproof-preview.vercel.app",
          "x-forwarded-host": "nuproof-preview.vercel.app",
          "x-forwarded-proto": "https"
        }
      }
    );

    expect(isAllowedRequestOrigin(request, "https://nuproof.vercel.app")).toBe(true);
  });

  it("rejects a foreign origin even when it claims to be same-site", () => {
    const request = new NextRequest(
      "https://nuproof.vercel.app/api/v1/transactions",
      {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "sec-fetch-site": "same-origin",
          "x-forwarded-host": "nuproof.vercel.app",
          "x-forwarded-proto": "https"
        }
      }
    );

    expect(isAllowedRequestOrigin(request, "https://nuproof.vercel.app")).toBe(false);
  });

  it("allows a same-origin browser fetch without referrer headers", () => {
    const request = new NextRequest(
      "https://nuproof.vercel.app/api/v1/transactions",
      {
        method: "GET",
        headers: {
          "sec-fetch-site": "same-origin",
          "x-forwarded-host": "nuproof.vercel.app",
          "x-forwarded-proto": "https"
        }
      }
    );

    expect(isAllowedRequestOrigin(request, "https://nuproof.vercel.app")).toBe(true);
  });

  it("keeps direct API navigation unauthorized", () => {
    const request = new NextRequest(
      "https://nuproof.vercel.app/api/v1/transactions",
      {
        method: "GET",
        headers: {
          "sec-fetch-site": "none",
          "x-forwarded-host": "nuproof.vercel.app",
          "x-forwarded-proto": "https"
        }
      }
    );

    expect(isAllowedRequestOrigin(request, "https://nuproof.vercel.app")).toBe(false);
  });
});
