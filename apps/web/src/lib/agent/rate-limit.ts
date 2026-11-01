/**
 * Fixed-window, per-client rate limit for the chat API.
 *
 * In-memory and per-instance: serverless instances do not share memory, so production
 * should back this with a shared store (e.g. Redis) keyed the same way.
 */

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 20;
const MAX_TRACKED_CLIENTS = 10_000;

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

const buckets = new Map<string, Bucket>();

/** Client key from the platform-set forwarding headers; falls back to a shared bucket. */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "anonymous";
}

export function checkRateLimit(key: string, now: number = Date.now()): RateLimitDecision {
  if (buckets.size > MAX_TRACKED_CLIENTS) {
    for (const [k, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - bucket.count, retryAfterSec: 0 };
}

export function resetRateLimits(): void {
  buckets.clear();
}
