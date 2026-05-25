import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Idempotency key TTL: 24 hours (in seconds)
export const IDEMPOTENCY_TTL = 86400;

/**
 * Checks if an idempotency key has been seen before.
 * Returns the cached response if found, or null if this is a fresh request.
 */
export async function checkIdempotency(
  key: string
): Promise<{ status: number; body: unknown } | null> {
  const cached = await redis.get<{ status: number; body: unknown }>(
    `idempotency:${key}`
  );
  return cached ?? null;
}

/**
 * Stores the response for an idempotency key.
 */
export async function storeIdempotency(
  key: string,
  status: number,
  body: unknown
): Promise<void> {
  await redis.set(
    `idempotency:${key}`,
    { status, body },
    { ex: IDEMPOTENCY_TTL }
  );
}
