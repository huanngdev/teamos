import Redis from "ioredis";

import type { Env } from "@/config/index.js";

function createRedisClient(env: Pick<Env, "REDIS_URL">): Redis {
  return new Redis(env.REDIS_URL, {
    connectTimeout: 1_000,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
}

export { createRedisClient };
