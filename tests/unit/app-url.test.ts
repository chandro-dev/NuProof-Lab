import { describe, expect, it } from "vitest";
import {
  getCanonicalAppUrl,
  getRequestOrigin,
  normalizeOrigin
} from "@/src/lib/app-url";

describe("application URL resolution", () => {
  it("prefers the stable Vercel production domain over a stale local APP_URL", () => {
    expect(
      getCanonicalAppUrl({
        APP_URL: "http://localhost:3000",
        VERCEL_URL: "nuproof-preview.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "nuproof.vercel.app"
      })
    ).toBe("https://nuproof.vercel.app");
  });

  it("uses APP_URL outside Vercel and removes paths and trailing slashes", () => {
    expect(getCanonicalAppUrl({ APP_URL: "https://verify.example.com/base/" })).toBe(
      "https://verify.example.com"
    );
  });

  it("derives the active deployment origin from forwarded headers", () => {
    const headers = new Headers({
      "x-forwarded-host": "nuproof-preview.vercel.app",
      "x-forwarded-proto": "https"
    });
    expect(
      getRequestOrigin({
        headers,
        nextUrl: { origin: "http://localhost:3000" }
      })
    ).toBe("https://nuproof-preview.vercel.app");
  });

  it("rejects malformed origins", () => {
    expect(normalizeOrigin("://invalid")).toBeUndefined();
  });
});
