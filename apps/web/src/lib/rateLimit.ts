import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let warned = false;
let limiters: Record<string, Ratelimit> | null | undefined;

/**
 * Rate limiting is opt-in: without UPSTASH_REDIS_REST_URL/TOKEN set, every check
 * passes through so local dev and free deployments without Upstash configured
 * still work — add a free Upstash Redis database (upstash.com) and set those two
 * env vars to actually enforce limits.
 */
function getLimiters(): Record<string, Ratelimit> | null {
  if (limiters !== undefined) return limiters;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warned) {
      console.warn("[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is disabled. Add a free Upstash Redis database to enable it.");
      warned = true;
    }
    limiters = null;
    return limiters;
  }
  const redis = new Redis({ url, token });
  limiters = {
    run: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 m"), analytics: true, prefix: "nextflow:run" }),
    generate: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 m"), analytics: true, prefix: "nextflow:generate" }),
  };
  return limiters;
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** `bucket` selects the limit tier (see getLimiters); `identifier` is typically the Clerk userId. */
export async function checkRateLimit(bucket: "run" | "generate", identifier: string): Promise<RateLimitResult> {
  const rl = getLimiters();
  if (!rl) return { ok: true };
  const result = await rl[bucket].limit(identifier);
  if (result.success) return { ok: true };
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) };
}
