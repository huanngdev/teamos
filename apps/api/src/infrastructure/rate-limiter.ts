import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import type Redis from "ioredis";

import type { Env } from "@/config/index.js";

function createMemoryRateLimiter(
  env: Pick<Env, "RATE_LIMIT_POINTS" | "RATE_LIMIT_DURATION_SECONDS">,
): RateLimiterMemory {
  return new RateLimiterMemory({
    duration: env.RATE_LIMIT_DURATION_SECONDS,
    points: env.RATE_LIMIT_POINTS,
  });
}

function createRedisRateLimiter(
  client: Redis,
  env: Pick<Env, "RATE_LIMIT_POINTS" | "RATE_LIMIT_DURATION_SECONDS">,
  keyPrefix = "teamos:api",
): RateLimiterRedis {
  return new RateLimiterRedis({
    duration: env.RATE_LIMIT_DURATION_SECONDS,
    inMemoryBlockOnConsumed: env.RATE_LIMIT_POINTS,
    insuranceLimiter: createMemoryRateLimiter(env),
    keyPrefix,
    points: env.RATE_LIMIT_POINTS,
    rejectIfRedisNotReady: true,
    storeClient: client,
  });
}

export { createMemoryRateLimiter, createRedisRateLimiter };
