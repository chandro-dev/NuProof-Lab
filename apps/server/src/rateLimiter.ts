import type { NextFunction, Request, Response } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

export function createVerifyRateLimiter(limit = 30, windowMs = 60_000) {
  const buckets = new Map<string, Bucket>();
  return (request: Request, response: Response, next: NextFunction): void => {
    const key = request.ip ?? "unknown";
    const now = Date.now();
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    response.setHeader("RateLimit-Limit", String(limit));
    response.setHeader("RateLimit-Remaining", String(Math.max(0, limit - bucket.count)));
    if (bucket.count > limit) {
      response.status(429).json({
        error: { code: "RATE_LIMITED", message: "Demasiadas verificaciones. Intenta más tarde." }
      });
      return;
    }
    next();
  };
}

