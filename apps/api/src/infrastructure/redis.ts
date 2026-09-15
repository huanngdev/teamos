import Redis from "ioredis";
import type { ILogLayer } from "loglayer";

import type { Env } from "@/config/index.js";

function createRedisClient(env: Pick<Env, "REDIS_URL">): Redis {
  return new Redis(env.REDIS_URL, {
    connectTimeout: 1_000,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
}

async function connectRedisClient(client: Redis): Promise<void> {
  if (client.status === "wait") {
    await client.connect();
  }

  await client.ping();
}

function attachRedisErrorLogger(client: Redis, logger: ILogLayer): void {
  client.on("error", (error) => {
    logger.withError(error).error("Redis client error");
  });
}

async function checkRedisConnection(client: Redis): Promise<void> {
  await client.ping();
}

async function closeRedisClient(client: Redis, timeoutMs: number): Promise<void> {
  if (client.status === "end") {
    return;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      client.quit(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Redis shutdown timed out.")), timeoutMs);
      }),
    ]);
  } catch {
    client.disconnect();
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

export {
  attachRedisErrorLogger,
  checkRedisConnection,
  closeRedisClient,
  connectRedisClient,
  createRedisClient,
};
