import { createRoute } from "@hono/zod-openapi";
import {
  createProjectStatusRequestSchema,
  organizationSlugSchema,
  projectStatusListResponseSchema,
  projectStatusResponseSchema,
  updateProjectStatusRequestSchema,
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

const projectParamsSchema = z.object({
  organizationSlug: organizationSlugSchema,
  projectId: z.uuid(),
});

const statusParamsSchema = projectParamsSchema.extend({
  statusId: z.uuid(),
});

const listProjectStatusesRoute = createRoute({
  method: "get",
  operationId: "listProjectStatuses",
  path: "/{organizationSlug}/projects/{projectId}/statuses",
  request: { params: projectParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: projectStatusListResponseSchema } },
      description: "Returns the project columns in board order.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "List project columns",
  tags: ["Issues"],
});

const createProjectStatusRoute = createRoute({
  method: "post",
  operationId: "createProjectStatus",
  path: "/{organizationSlug}/projects/{projectId}/statuses",
  request: {
    body: {
      content: { "application/json": { schema: createProjectStatusRequestSchema } },
      required: true,
    },
    params: projectParamsSchema,
  },
  responses: {
    201: {
      content: { "application/json": { schema: projectStatusResponseSchema } },
      description: "The column was created.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Create a project column",
  tags: ["Issues"],
});

const updateProjectStatusRoute = createRoute({
  method: "patch",
  operationId: "updateProjectStatus",
  path: "/{organizationSlug}/projects/{projectId}/statuses/{statusId}",
  request: {
    body: {
      content: { "application/json": { schema: updateProjectStatusRequestSchema } },
      required: true,
    },
    params: statusParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: projectStatusResponseSchema } },
      description: "The column was updated.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Rename or reorder a project column",
  tags: ["Issues"],
});

const deleteProjectStatusRoute = createRoute({
  method: "delete",
  operationId: "deleteProjectStatus",
  path: "/{organizationSlug}/projects/{projectId}/statuses/{statusId}",
  request: { params: statusParamsSchema },
  responses: {
    204: {
      description: "The column was deleted.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Delete an empty project column",
  tags: ["Issues"],
});

function registerProjectStatusRoutes(
  routes: OrganizationRoutes,
  dependencies: OrganizationRouteDependencies,
): void {
  const { organizationAccess, projectStatuses } = dependencies;

  routes.openapi(listProjectStatusesRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const statuses = await projectStatuses.list({ organization, projectId });

    return context.json(projectStatusListResponseSchema.parse({ statuses }), 200);
  });

  routes.openapi(createProjectStatusRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId } = context.req.valid("param");
    const request = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const status = await projectStatuses.create({ organization, projectId, request });

    return context.json(projectStatusResponseSchema.parse({ status }), 201);
  });

  routes.openapi(updateProjectStatusRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId, statusId } = context.req.valid("param");
    const request = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const status = await projectStatuses.update({ organization, projectId, request, statusId });

    return context.json(projectStatusResponseSchema.parse({ status }), 200);
  });

  routes.openapi(deleteProjectStatusRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId, statusId } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );

    await projectStatuses.remove({ organization, projectId, statusId });

    return context.body(null, 204);
  });
}

export { registerProjectStatusRoutes };
