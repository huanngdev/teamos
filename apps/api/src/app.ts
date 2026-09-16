import type { ILogLayer } from "loglayer";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { RateLimiterLike } from "rate-limiter-flexible";

import type { AuthService, OrganizationAccessService } from "@/auth/index.js";
import type { Env } from "@/config/index.js";
import { registerErrorHandlers } from "@/errors/index.js";
import { createMemoryRateLimiter } from "@/infrastructure/index.js";
import { createLogger } from "@/logging/index.js";
import { registerGlobalMiddleware } from "@/middleware/index.js";
import { registerApiDocumentation } from "@/openapi/index.js";
import {
  createAuthenticationRoutes,
  createCurrentUserRoutes,
  createHealthRoutes,
  createOrganizationRoutes,
  rootRoutes,
} from "@/routes/index.js";
import { createUnavailableReadinessService, type ReadinessService } from "@/services/index.js";
import type { AppEnv } from "@/types.js";

interface CreateAppOptions {
  auth?: AuthService;
  env: Env;
  logger?: ILogLayer;
  organizationAccess?: OrganizationAccessService;
  rateLimiter?: RateLimiterLike;
  readiness?: ReadinessService;
}

function createApp(options: CreateAppOptions): OpenAPIHono<AppEnv> {
  const logger = options.logger ?? createLogger(options.env);
  const rateLimiter = options.rateLimiter ?? createMemoryRateLimiter(options.env);
  const readiness = options.readiness ?? createUnavailableReadinessService();
  const app = new OpenAPIHono<AppEnv>();

  registerGlobalMiddleware(app, { env: options.env, logger, rateLimiter });

  app.route("/", rootRoutes);
  app.route("/health", createHealthRoutes(readiness));

  const auth = options.auth;
  if (auth !== undefined) {
    app.route("/api/authentication", createAuthenticationRoutes(options.env));
    app.route("/api/me", createCurrentUserRoutes(auth));

    const organizationAccess = options.organizationAccess;
    if (organizationAccess !== undefined) {
      app.route("/api/organizations", createOrganizationRoutes(auth, organizationAccess));
    }

    app.all("/api/auth/*", (context) => auth.handler(context.req.raw));
  }

  registerApiDocumentation(app, options.env.API_DOCS_ENABLED);

  registerErrorHandlers(app, logger);

  return app;
}

export { createApp };
