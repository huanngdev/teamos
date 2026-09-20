import { createRoute } from "@hono/zod-openapi";
import {
  deleteOrganizationRequestSchema,
  organizationContextResponseSchema,
  organizationSlugSchema,
  updateOrganizationRequestSchema,
} from "@teamos/shared";
import { z } from "zod";

import { getAuthenticatedSession } from "@/auth/index.js";
import {
  apiErrorResponses,
  protectedRouteErrorResponses,
  requestIdHeaders,
} from "@/openapi/index.js";
import { requireOrganizationAccess } from "@/routes/helpers.js";
import type {
  OrganizationRouteDependencies,
  OrganizationRoutes,
} from "@/routes/organization-types.js";

const organizationParamsSchema = z.object({
  organizationSlug: organizationSlugSchema,
});

const updateOrganizationRoute = createRoute({
  method: "patch",
  operationId: "updateOrganization",
  path: "/{organizationSlug}",
  request: {
    body: {
      content: { "application/json": { schema: updateOrganizationRequestSchema } },
      required: true,
    },
    params: organizationParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: organizationContextResponseSchema } },
      description: "Returns the updated organization and the caller's role.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Rename a workspace",
  tags: ["Organizations"],
});

const deleteOrganizationRoute = createRoute({
  method: "delete",
  operationId: "deleteOrganization",
  path: "/{organizationSlug}",
  request: {
    body: {
      content: { "application/json": { schema: deleteOrganizationRequestSchema } },
      required: true,
    },
    params: organizationParamsSchema,
  },
  responses: {
    204: {
      description: "The workspace and its dependent records were deleted.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Delete a workspace",
  tags: ["Organizations"],
});

/*
 * The settings facade keeps rename and deletion behind TeamOS authorization,
 * auditing, rate limiting, and the typed-name confirmation. Better Auth's own
 * update/delete endpoints stay blocked for browser callers.
 */
function registerOrganizationSettingsRoutes(
  routes: OrganizationRoutes,
  dependencies: OrganizationRouteDependencies,
): void {
  const { management, members, organizationAccess } = dependencies;

  routes.openapi(updateOrganizationRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug } = context.req.valid("param");
    const request = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const updated = await management.updateOrganization({
      headers: context.req.raw.headers,
      organization,
      request,
    });
    const memberCount = await members.count(organization.organizationId);

    return context.json(
      organizationContextResponseSchema.parse({
        organization: {
          ...updated,
          memberCount,
          role: organization.role,
        },
      }),
      200,
    );
  });

  routes.openapi(deleteOrganizationRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug } = context.req.valid("param");
    const request = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );

    await management.deleteOrganization({
      headers: context.req.raw.headers,
      organization,
      request,
    });

    return context.body(null, 204);
  });
}

export { deleteOrganizationRoute, registerOrganizationSettingsRoutes, updateOrganizationRoute };
