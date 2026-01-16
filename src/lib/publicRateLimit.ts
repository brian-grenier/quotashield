import "server-only";

import { getRedis } from "@/lib/redis";

const RATE_LIMIT_PER_MINUTE = 30;

function epochMinute(now: Date): number {
  return Math.floor(now.getTime() / 60_000);
}

function formatDayUTC(now: Date): string {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatMonthUTC(now: Date): string {
  return now.toISOString().slice(0, 7); // YYYY-MM
}

export async function enforceRateLimitByKeyHash(keyHash: string) {
  const redis = getRedis();
  const now = new Date();

  const minute = epochMinute(now);
  const key = `ratelimit:${keyHash}:${minute}`;

  const count = await redis.incr(key);
  if (count === 1) {
    // Expire after ~1 minute; key name is already per-minute bucket.
    await redis.expire(key, 60);
  }

  if (count > RATE_LIMIT_PER_MINUTE) {
    return { ok: false as const, limit: RATE_LIMIT_PER_MINUTE, remaining: 0 };
  }

  return { ok: true as const, limit: RATE_LIMIT_PER_MINUTE, remaining: RATE_LIMIT_PER_MINUTE - count };
}

export async function incrementUsageCountersByKeyHash(keyHash: string) {
  const redis = getRedis();
  const now = new Date();

  const day = formatDayUTC(now);
  const month = formatMonthUTC(now);

  const dayKey = `usage:day:${keyHash}:${day}`;
  const monthKey = `usage:month:${keyHash}:${month}`;

  // Usage increments are best-effort but should be atomic.
  await redis.pipeline().incr(dayKey).incr(monthKey).exec();
}

