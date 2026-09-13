import type { ILogLayer } from "loglayer";
import { Hono } from "hono";
import type { RateLimiterLike } from "rate-limiter-flexible";

import type { Env } from "@/config/index.js";
import { registerErrorHandlers } from "@/errors/index.js";
import { createMemoryRateLimiter } from "@/infrastructure/index.js";
import { createLogger } from "@/logging/index.js";
import { registerGlobalMiddleware } from "@/middleware/index.js";
import { healthRoutes, rootRoutes } from "@/routes/index.js";
import type { AppEnv } from "@/types.js";

interface CreateAppOptions {
  env: Env;
  logger?: ILogLayer;
  rateLimiter?: RateLimiterLike;
}

function createApp(options: CreateAppOptions): Hono<AppEnv> {
  const logger = options.logger ?? createLogger(options.env);
  const rateLimiter = options.rateLimiter ?? createMemoryRateLimiter(options.env);
  const app = new Hono<AppEnv>();

  registerGlobalMiddleware(app, { env: options.env, logger, rateLimiter });

  app.route("/", rootRoutes);
  app.route("/health", healthRoutes);

  registerErrorHandlers(app, logger);

  return app;
}

export { createApp };
