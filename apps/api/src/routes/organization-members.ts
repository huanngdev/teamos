import { createRoute } from "@hono/zod-openapi";
import {
  memberListQuerySchema,
  memberListResponseSchema,
  organizationSlugSchema,
  updateMemberRoleSchema,
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

const memberParamsSchema = z.object({
  memberId: z.string().min(1).max(200),
  organizationSlug: organizationSlugSchema,
});

const organizationParamsSchema = z.object({
  organizationSlug: organizationSlugSchema,
});

const listMembersRoute = createRoute({
  method: "get",
  operationId: "listOrganizationMembers",
  path: "/{organizationSlug}/members",
  request: {
    params: organizationParamsSchema,
    query: memberListQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: memberListResponseSchema } },
      description: "Returns a page of workspace members matching the optional search term.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "List workspace members",
  tags: ["Organizations"],
});

const updateMemberRoleRoute = createRoute({
  method: "patch",
  operationId: "updateOrganizationMemberRole",
  path: "/{organizationSlug}/members/{memberId}/role",
  request: {
    body: {
      content: { "application/json": { schema: updateMemberRoleSchema } },
      required: true,
    },
    params: memberParamsSchema,
  },
  responses: {
    204: {
      description: "The member role was updated.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Update a workspace member role",
  tags: ["Organizations"],
});

const removeMemberRoute = createRoute({
  method: "delete",
  operationId: "removeOrganizationMember",
  path: "/{organizationSlug}/members/{memberId}",
  request: {
    params: memberParamsSchema,
  },
  responses: {
    204: {
      description: "The member was removed from the workspace.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Remove a workspace member",
  tags: ["Organizations"],
});

function registerOrganizationMemberRoutes(
  routes: OrganizationRoutes,
  dependencies: OrganizationRouteDependencies,
): void {
  const { management, members, organizationAccess } = dependencies;

  routes.openapi(listMembersRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug } = context.req.valid("param");
    const { limit, offset, search } = context.req.valid("query");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const result = await members.list({
      limit,
      offset,
      organizationId: organization.organizationId,
      search,
    });

    return context.json(
      memberListResponseSchema.parse({
        members: result.members,
        pagination: { limit, offset, total: result.total },
      }),
      200,
    );
  });

  routes.openapi(updateMemberRoleRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { memberId, organizationSlug } = context.req.valid("param");
    const { role } = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );

    await management.updateMemberRole({
      headers: context.req.raw.headers,
      memberId,
      organization,
      role,
    });

    return context.body(null, 204);
  });

  routes.openapi(removeMemberRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { memberId, organizationSlug } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );

    await management.removeMember({
      actorUserId: session.user.id,
      headers: context.req.raw.headers,
      memberId,
      organization,
    });

    return context.body(null, 204);
  });
}

export {
  listMembersRoute,
  registerOrganizationMemberRoutes,
  removeMemberRoute,
  updateMemberRoleRoute,
};
