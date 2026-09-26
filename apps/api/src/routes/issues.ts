import { createRoute } from "@hono/zod-openapi";
import {
  createIssueRequestSchema,
  issueListResponseSchema,
  issueResponseSchema,
  organizationSlugSchema,
  updateIssueRequestSchema,
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

const issueParamsSchema = projectParamsSchema.extend({
  issueId: z.uuid(),
});

const listIssuesRoute = createRoute({
  method: "get",
  operationId: "listIssues",
  path: "/{organizationSlug}/projects/{projectId}/issues",
  request: { params: projectParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: issueListResponseSchema } },
      description: "Returns up to 200 issues for the project board.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "List project issues",
  tags: ["Issues"],
});

const createIssueRoute = createRoute({
  method: "post",
  operationId: "createIssue",
  path: "/{organizationSlug}/projects/{projectId}/issues",
  request: {
    body: {
      content: { "application/json": { schema: createIssueRequestSchema } },
      required: true,
    },
    params: projectParamsSchema,
  },
  responses: {
    201: {
      content: { "application/json": { schema: issueResponseSchema } },
      description: "The issue was created at the top of the chosen column.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Create an issue",
  tags: ["Issues"],
});

const updateIssueRoute = createRoute({
  method: "patch",
  operationId: "updateIssue",
  path: "/{organizationSlug}/projects/{projectId}/issues/{issueId}",
  request: {
    body: {
      content: { "application/json": { schema: updateIssueRequestSchema } },
      required: true,
    },
    params: issueParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: issueResponseSchema } },
      description: "The issue was updated.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Update an issue",
  tags: ["Issues"],
});

const deleteIssueRoute = createRoute({
  method: "delete",
  operationId: "deleteIssue",
  path: "/{organizationSlug}/projects/{projectId}/issues/{issueId}",
  request: { params: issueParamsSchema },
  responses: {
    204: {
      description: "The issue was deleted.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Delete an issue",
  tags: ["Issues"],
});

function registerIssueRoutes(
  routes: OrganizationRoutes,
  dependencies: OrganizationRouteDependencies,
): void {
  const { issues, organizationAccess } = dependencies;

  routes.openapi(listIssuesRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const result = await issues.list({ organization, projectId });

    return context.json(issueListResponseSchema.parse(result), 200);
  });

  routes.openapi(createIssueRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId } = context.req.valid("param");
    const request = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const created = await issues.create({ organization, projectId, request });

    return context.json(issueResponseSchema.parse({ issue: created }), 201);
  });

  routes.openapi(updateIssueRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { issueId, organizationSlug, projectId } = context.req.valid("param");
    const request = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const updated = await issues.update({ issueId, organization, projectId, request });

    return context.json(issueResponseSchema.parse({ issue: updated }), 200);
  });

  routes.openapi(deleteIssueRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { issueId, organizationSlug, projectId } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );

    await issues.remove({ issueId, organization, projectId });

    return context.body(null, 204);
  });
}

export { registerIssueRoutes };
