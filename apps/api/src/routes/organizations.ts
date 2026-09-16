import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  organizationContextResponseSchema,
  organizationSlugSchema,
  type OrganizationContext,
} from "@teamos/shared";
import { z } from "zod";

import {
  createRequireVerifiedSessionMiddleware,
  createSessionMiddleware,
  getAuthenticatedSession,
  type AuthService,
  type OrganizationAccessService,
} from "@/auth/index.js";
import { AppError } from "@/errors/index.js";
import {
  apiErrorResponses,
  protectedRouteErrorResponses,
  requestIdHeaders,
} from "@/openapi/index.js";
import type { AppEnv } from "@/types.js";

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

function createOrganizationRoutes(
  auth: AuthService,
  organizationAccess: OrganizationAccessService,
) {
  const routes = new OpenAPIHono<AppEnv>();

  routes.use("*", createSessionMiddleware(auth), createRequireVerifiedSessionMiddleware());
  routes.openapi(getOrganizationRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug } = context.req.valid("param");
    const organization: OrganizationContext | undefined = await organizationAccess.resolve({
      organizationSlug,
      userId: session.user.id,
    });

    if (organization === undefined) {
      throw new AppError(404, "ORGANIZATION_NOT_FOUND", "The organization was not found.");
    }

    return context.json(organizationContextResponseSchema.parse({ organization }), 200);
  });

  return routes;
}

export { createOrganizationRoutes, getOrganizationRoute };
