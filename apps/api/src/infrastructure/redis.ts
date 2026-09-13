import Redis from "ioredis";
import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";

import type { Env } from "@/config/index.js";

function createRedisClient(env: Pick<Env, "REDIS_URL">): Redis {
  return new Redis(env.REDIS_URL, {
    connectTimeout: 1_000,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
}

function createRateLimiter(
  client: Redis,
  env: Pick<Env, "RATE_LIMIT_POINTS" | "RATE_LIMIT_DURATION_SECONDS">,
): RateLimiterRedis {
  return new RateLimiterRedis({
    duration: env.RATE_LIMIT_DURATION_SECONDS,
    inMemoryBlockOnConsumed: env.RATE_LIMIT_POINTS,
    insuranceLimiter: new RateLimiterMemory({
      duration: env.RATE_LIMIT_DURATION_SECONDS,
      points: env.RATE_LIMIT_POINTS,
    }),
    keyPrefix: "teamos:api",
    points: env.RATE_LIMIT_POINTS,
    rejectIfRedisNotReady: true,
    storeClient: client,
  });
}

export { createRateLimiter, createRedisClient };
