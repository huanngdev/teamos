import { createRoute } from "@hono/zod-openapi";
import type { RateLimiterLike } from "rate-limiter-flexible";
import { organizationContextResponseSchema, organizationSlugSchema } from "@teamos/shared";
import { z } from "zod";

import {
  createRequireVerifiedSessionMiddleware,
  createSessionMiddleware,
  getAuthenticatedSession,
  type AuthService,
} from "@/auth/index.js";
import type { Env } from "@/config/index.js";
import { createRateLimitMiddleware } from "@/middleware/index.js";
import { createOpenApiRouter } from "@/openapi/index.js";
import {
  apiErrorResponses,
  protectedRouteErrorResponses,
  requestIdHeaders,
} from "@/openapi/index.js";
import { registerOrganizationInvitationRoutes } from "@/routes/organization-invitations.js";
import { registerOrganizationMemberRoutes } from "@/routes/organization-members.js";
import { registerOrganizationSettingsRoutes } from "@/routes/organization-settings.js";
import type {
  OrganizationRouteDependencies,
  OrganizationRoutes,
} from "@/routes/organization-types.js";
import { registerIssueRoutes } from "@/routes/issues.js";
import { registerProjectRoutes } from "@/routes/projects.js";
import { registerProjectStatusRoutes } from "@/routes/project-statuses.js";
import { requireOrganizationAccess } from "@/routes/helpers.js";

const organizationParamsSchema = z.object({
  organizationSlug: organizationSlugSchema,
});

const getOrganizationRoute = createRoute({
  method: "get",
  operationId: "getOrganizationContext",
  path: "/{organizationSlug}",
  request: {
    params: organizationParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: organizationContextResponseSchema } },
      description: "Returns the organization and the authenticated member's role.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Get an organization workspace",
  tags: ["Organizations"],
});

interface CreateOrganizationRoutesOptions extends OrganizationRouteDependencies {
  auth: AuthService;
  env: Env;
  managementRateLimiter: RateLimiterLike;
}

/*
 * Every organization-scoped route shares one middleware chain so session
 * resolution and the per-actor management rate limit run exactly once per
 * request instead of once per route group.
 */
function createOrganizationRoutes(options: CreateOrganizationRoutesOptions): OrganizationRoutes {
  const routes: OrganizationRoutes = createOpenApiRouter();

  routes.use(
    "*",
    createSessionMiddleware(options.auth),
    createRequireVerifiedSessionMiddleware(),
    createRateLimitMiddleware({
      enabled: options.env.RATE_LIMIT_ENABLED,
      /*
       * Keyed by the authenticated actor rather than the client IP so one
       * workspace cannot consume another workspace's sensitive-action budget.
       */
      key: (context) => {
        const session = context.get("authSession");

        return session === null ? `ip:${context.get("clientIp")}` : `user:${session.user.id}`;
      },
      limiter: options.managementRateLimiter,
      points: options.env.MANAGEMENT_RATE_LIMIT_POINTS,
    }),
  );

  routes.openapi(getOrganizationRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      options.organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const memberCount = await options.members.count(organization.organizationId);

    return context.json(
      organizationContextResponseSchema.parse({
        organization: {
          createdAt: organization.createdAt.toISOString(),
          id: organization.organizationId,
          logo: organization.logo,
          memberCount,
          name: organization.name,
          role: organization.role,
          slug: organization.slug,
        },
      }),
      200,
    );
  });

  registerOrganizationMemberRoutes(routes, options);
  registerOrganizationInvitationRoutes(routes, options);
  registerOrganizationSettingsRoutes(routes, options);
  registerProjectRoutes(routes, options);
  registerProjectStatusRoutes(routes, options);
  registerIssueRoutes(routes, options);

  return routes;
}

export { createOrganizationRoutes, getOrganizationRoute };
