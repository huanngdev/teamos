import { createApp } from "@/app.js";
import { loadEnv } from "@/config/index.js";
import { createRateLimiter, createRedisClient } from "@/infrastructure/index.js";
import { createLogger } from "@/logging/index.js";

function isAddressInUseError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EADDRINUSE";
}

function reportStartupFailure(error: unknown): never {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const env = (() => {
  try {
    return loadEnv();
  } catch (error) {
    return reportStartupFailure(error);
  }
})();
const logger = createLogger(env);
const redisClient = createRedisClient(env);
const app = createApp({
  env,
  logger,
  rateLimiter: createRateLimiter(redisClient, env),
});

let server: Bun.Server<undefined>;
try {
  server = Bun.serve({
    fetch: (request, bunServer) => {
      return app.fetch(request, {
        clientIp: bunServer.requestIP(request)?.address,
      });
    },
    idleTimeout: env.IDLE_TIMEOUT_SECONDS,
    maxRequestBodySize: env.MAX_REQUEST_BODY_BYTES,
    port: env.PORT,
  });

  logger.info(`TeamOS API is running on ${server.url}`);
} catch (error) {
  if (!isAddressInUseError(error)) {
    throw error;
  }

  reportStartupFailure(
    new Error(
      `TeamOS API could not start because port ${env.PORT} is already in use. ` +
        `Stop the process using it or run with PORT=<free-port> bun run --cwd apps/api dev.`,
    ),
  );
}

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}; shutting down TeamOS API`);
  await server.stop();
  redisClient.disconnect();
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
