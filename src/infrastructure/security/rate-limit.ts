import "server-only";

import type { RateLimitDecision, RateLimitService } from "@/src/domain/ports";

interface Bucket {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimitService implements RateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  public constructor(
    private readonly limit = 30,
    private readonly windowMs = 60_000
  ) {}

  public async consume(key: string): Promise<RateLimitDecision> {
    const now = Date.now();
    const existing = this.buckets.get(key);
    const bucket =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + this.windowMs }
        : existing;
    bucket.count += 1;
    this.buckets.set(key, bucket);
    return {
      allowed: bucket.count <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    };
  }
}
