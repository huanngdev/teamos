import type { ILogLayer } from "loglayer";
import type { OpenAPIHono } from "@hono/zod-openapi";
import type { RateLimiterLike } from "rate-limiter-flexible";

import {
  isManagedOrganizationPath,
  type AuthService,
  type OrganizationAccessService,
} from "@/auth/index.js";
import type { Env } from "@/config/index.js";
import { AppError, registerErrorHandlers } from "@/errors/index.js";
import { createMemoryRateLimiter } from "@/infrastructure/index.js";
import { createLogger } from "@/logging/index.js";
import { registerGlobalMiddleware } from "@/middleware/index.js";
import { createOpenApiRouter, registerApiDocumentation } from "@/openapi/index.js";
import {
  createAuthenticationRoutes,
  createCurrentUserRoutes,
  createHealthRoutes,
  createOrganizationRoutes,
  rootRoutes,
} from "@/routes/index.js";
import type {
  OrganizationManagementService,
  OrganizationMemberService,
  ProjectService,
  ReadinessService,
} from "@/services/index.js";
import { createUnavailableReadinessService } from "@/services/index.js";
import type { AppEnv } from "@/types.js";

interface OrganizationServices {
  management: OrganizationManagementService;
  members: OrganizationMemberService;
  organizationAccess: OrganizationAccessService;
  projects: ProjectService;
}

interface CreateAppOptions {
  auth?: AuthService;
  env: Env;
  logger?: ILogLayer;
  managementRateLimiter?: RateLimiterLike;
  organization?: OrganizationServices;
  rateLimiter?: RateLimiterLike;
  readiness?: ReadinessService;
}

function createApp(options: CreateAppOptions): OpenAPIHono<AppEnv> {
  const logger = options.logger ?? createLogger(options.env);
  const rateLimiter = options.rateLimiter ?? createMemoryRateLimiter(options.env);
  const managementRateLimiter =
    options.managementRateLimiter ??
    createMemoryRateLimiter({
      RATE_LIMIT_DURATION_SECONDS: options.env.RATE_LIMIT_DURATION_SECONDS,
      RATE_LIMIT_POINTS: options.env.MANAGEMENT_RATE_LIMIT_POINTS,
    });
  const readiness = options.readiness ?? createUnavailableReadinessService();
  const app = createOpenApiRouter();

  registerGlobalMiddleware(app, { env: options.env, logger, rateLimiter });

  app.route("/", rootRoutes);
  app.route("/health", createHealthRoutes(readiness));

  const auth = options.auth;
  if (auth !== undefined) {
    app.route("/api/authentication", createAuthenticationRoutes(options.env));
    app.route("/api/me", createCurrentUserRoutes(auth));

    const organization = options.organization;
    if (organization !== undefined) {
      app.route(
        "/api/organizations",
        createOrganizationRoutes({
          auth,
          env: options.env,
          logger,
          managementRateLimiter,
          ...organization,
        }),
      );
    }

    /*
     * TeamOS owns member and invitation management through the routes above.
     * The replaced Better Auth endpoints stay blocked so a browser cannot bypass
     * TeamOS authorization, auditing, and rate limiting by calling them
     * directly. Server-side calls through the auth API are unaffected.
     */
    app.all("/api/auth/*", async (context, next) => {
      if (isManagedOrganizationPath(context.req.path)) {
        logger
          .withMetadata({ path: context.req.path })
          .warn("blocked direct call to a TeamOS-managed auth endpoint");
        throw new AppError(404, "NOT_FOUND", "The requested resource was not found.");
      }

      await next();
    });

    app.all("/api/auth/*", (context) => auth.handler(context.req.raw));
  }

  registerApiDocumentation(app, options.env.API_DOCS_ENABLED);

  registerErrorHandlers(app, logger);

  return app;
}

export { createApp, type CreateAppOptions, type OrganizationServices };
