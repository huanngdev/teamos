import { createDatabase, drizzleStudioUrl, type DatabaseClient } from "@teamos/db";
import type { ILogLayer } from "loglayer";
import type Redis from "ioredis";

import { createApp } from "@/app.js";
import {
  createAuth,
  createAuthService,
  createOrganizationAccessService,
  createOrganizationGateway,
  createUserGateway,
} from "@/auth/index.js";
import type { Env } from "@/config/index.js";
import {
  attachRedisErrorLogger,
  checkRedisConnection,
  closeRedisClient,
  connectRedisClient,
  createEmailService,
  createObjectStorageClient,
  createRedisRateLimiter,
  createRedisClient,
  type ObjectStorageClient,
} from "@/infrastructure/index.js";
import { createLogger } from "@/logging/index.js";
import {
  createOrganizationManagementService,
  createOrganizationMemberService,
  createProjectService,
  createReadinessService,
  createUserProfileService,
} from "@/services/index.js";

interface ServiceResource {
  name: "database" | "redis" | "storage";
  close: () => Promise<void> | void;
  connect: (signal: AbortSignal) => Promise<void>;
}

interface BootstrapResources {
  database: DatabaseClient;
  redis: Redis;
  storage: ObjectStorageClient;
}

interface BootstrapOptions {
  env: Env;
  logger?: ILogLayer;
}

interface RunningApi {
  app: ReturnType<typeof createApp>;
  server: Bun.Server<undefined>;
  shutdown: (signal: string) => Promise<void>;
}

class StartupError extends Error {
  readonly services: readonly ServiceResource["name"][];

  constructor(services: readonly ServiceResource["name"][]) {
    super(`API startup failed; unavailable services: ${services.join(", ")}.`);
    this.name = "StartupError";
    this.services = services;
  }
}

async function withTimeout(
  operation: (signal: AbortSignal) => Promise<void>,
  timeoutMs: number,
): Promise<void> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error(`Service connection timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    controller.abort();
  }
}

async function connectServices(
  services: readonly ServiceResource[],
  timeoutMs: number,
  logger: ILogLayer,
): Promise<void> {
  const results = await Promise.allSettled(
    services.map(async (service) => {
      logger.withMetadata({ service: service.name }).info("connecting service");
      try {
        await withTimeout(service.connect, timeoutMs);
        logger.withMetadata({ service: service.name }).info("service connected");
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({ service: service.name })
          .error("service connection failed");
        throw error;
      }
    }),
  );
  const failedServices = results.flatMap((result, index) =>
    result.status === "rejected" && services[index] !== undefined ? [services[index].name] : [],
  );

  if (failedServices.length > 0) {
    throw new StartupError(failedServices);
  }
}

async function closeServices(
  services: readonly ServiceResource[],
  logger: ILogLayer,
): Promise<void> {
  const results = await Promise.allSettled(services.map((service) => service.close()));

  results.forEach((result, index) => {
    const service = services[index];
    if (result.status === "rejected" && service !== undefined) {
      logger
        .withError(result.reason)
        .withMetadata({ service: service.name })
        .warn("service shutdown failed");
    }
  });
}

function createResources(env: Env): BootstrapResources {
  return {
    database: createDatabase({
      connectionString: env.DATABASE_URL,
      shutdownTimeoutSeconds: Math.ceil(env.SHUTDOWN_TIMEOUT_MS / 1_000),
    }),
    redis: createRedisClient(env),
    storage: createObjectStorageClient(env),
  };
}

function createServiceResources(resources: BootstrapResources, env: Env): ServiceResource[] {
  return [
    {
      close: resources.database.close,
      connect: async (signal) => {
        await resources.database.connect();
        await resources.database.checkConnection(signal);
      },
      name: "database",
    },
    {
      close: () => closeRedisClient(resources.redis, env.SHUTDOWN_TIMEOUT_MS),
      connect: () => connectRedisClient(resources.redis),
      name: "redis",
    },
    {
      close: resources.storage.close,
      connect: resources.storage.checkConnection,
      name: "storage",
    },
  ];
}

/*
 * Emitted as a single log record so the API and Drizzle Studio URLs stay
 * adjacent even though the API and Studio are independent processes.
 */
function buildReadyLogMetadata(env: Env, apiUrl: string): Record<string, string> {
  return env.NODE_ENV === "development" ? { apiUrl, drizzleStudioUrl } : { apiUrl };
}

async function bootstrap(options: BootstrapOptions): Promise<RunningApi> {
  const logger = options.logger ?? createLogger(options.env);
  const resources = createResources(options.env);
  attachRedisErrorLogger(resources.redis, logger);
  const services = createServiceResources(resources, options.env);

  try {
    await connectServices(services, options.env.STARTUP_TIMEOUT_MS, logger);

    const readiness = createReadinessService({
      database: resources.database.checkConnection,
      redis: () => checkRedisConnection(resources.redis),
      storage: resources.storage.checkConnection,
    });
    const auth = createAuth({
      db: resources.database.db,
      emailService: createEmailService(options.env),
      env: options.env,
      logger,
    });
    const memberService = createOrganizationMemberService(resources.database.db);
    const managementRateLimiter = createRedisRateLimiter(
      resources.redis,
      {
        RATE_LIMIT_DURATION_SECONDS: options.env.RATE_LIMIT_DURATION_SECONDS,
        RATE_LIMIT_POINTS: options.env.MANAGEMENT_RATE_LIMIT_POINTS,
      },
      "teamos:api:management",
    );
    const app = createApp({
      auth: createAuthService(auth),
      env: options.env,
      logger,
      managementRateLimiter,
      organization: {
        management: createOrganizationManagementService({
          gateway: createOrganizationGateway(auth),
          logger,
          members: memberService,
        }),
        members: memberService,
        organizationAccess: createOrganizationAccessService(resources.database.db),
        projects: createProjectService({
          db: resources.database.db,
          members: memberService,
        }),
      },
      profile: createUserProfileService({
        gateway: createUserGateway(auth),
        logger,
      }),
      rateLimiter: createRedisRateLimiter(resources.redis, options.env),
      readiness,
    });
    const server = Bun.serve({
      fetch: (request, bunServer) => {
        return app.fetch(request, {
          clientIp: bunServer.requestIP(request)?.address,
        });
      },
      idleTimeout: options.env.IDLE_TIMEOUT_SECONDS,
      maxRequestBodySize: options.env.MAX_REQUEST_BODY_BYTES,
      port: options.env.PORT,
    });
    let isShuttingDown = false;

    logger
      .withMetadata(buildReadyLogMetadata(options.env, server.url.toString()))
      .info("TeamOS API is ready");

    return {
      app,
      server,
      shutdown: async (signal) => {
        if (isShuttingDown) {
          return;
        }

        isShuttingDown = true;
        logger.withMetadata({ signal }).info("shutting down TeamOS API");
        await server.stop();
        await closeServices(services, logger);
        logger.info("TeamOS API shutdown complete");
      },
    };
  } catch (error) {
    await closeServices(services, logger);
    throw error;
  }
}

export {
  bootstrap,
  buildReadyLogMetadata,
  closeServices,
  connectServices,
  createServiceResources,
  StartupError,
  withTimeout,
  type BootstrapResources,
  type RunningApi,
  type ServiceResource,
};
