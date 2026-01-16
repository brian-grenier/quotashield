import "server-only";

import { Redis } from "@upstash/redis";

declare global {
  var _upstashRedis: Redis | undefined;
}

export function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local.",
    );
  }

  if (!global._upstashRedis) {
    global._upstashRedis = new Redis({ url, token });
  }

  return global._upstashRedis;
}

