import { createRoute } from "@hono/zod-openapi";
import {
  createIssueViewRequestSchema,
  issueViewListQuerySchema,
  issueViewListResponseSchema,
  issueViewResponseSchema,
  organizationSlugSchema,
  updateIssueViewRequestSchema,
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

const viewParamsSchema = projectParamsSchema.extend({
  viewId: z.uuid(),
});

const listIssueViewsRoute = createRoute({
  method: "get",
  operationId: "listIssueViews",
  path: "/{organizationSlug}/projects/{projectId}/views",
  request: { params: projectParamsSchema, query: issueViewListQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: issueViewListResponseSchema } },
      description: "Returns the project views the caller is allowed to open.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "List project views",
  tags: ["Issue views"],
});

const createIssueViewRoute = createRoute({
  method: "post",
  operationId: "createIssueView",
  path: "/{organizationSlug}/projects/{projectId}/views",
  request: {
    body: {
      content: { "application/json": { schema: createIssueViewRequestSchema } },
      required: true,
    },
    params: projectParamsSchema,
  },
  responses: {
    201: {
      content: { "application/json": { schema: issueViewResponseSchema } },
      description: "The view was created.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Create a project view",
  tags: ["Issue views"],
});

const getIssueViewRoute = createRoute({
  method: "get",
  operationId: "getIssueView",
  path: "/{organizationSlug}/projects/{projectId}/views/{viewId}",
  request: { params: viewParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: issueViewResponseSchema } },
      description: "Returns one view the caller is allowed to open.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Get a project view",
  tags: ["Issue views"],
});

const updateIssueViewRoute = createRoute({
  method: "patch",
  operationId: "updateIssueView",
  path: "/{organizationSlug}/projects/{projectId}/views/{viewId}",
  request: {
    body: {
      content: { "application/json": { schema: updateIssueViewRequestSchema } },
      required: true,
    },
    params: viewParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: issueViewResponseSchema } },
      description: "The view was updated.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Update a project view",
  tags: ["Issue views"],
});

const deleteIssueViewRoute = createRoute({
  method: "delete",
  operationId: "deleteIssueView",
  path: "/{organizationSlug}/projects/{projectId}/views/{viewId}",
  request: { params: viewParamsSchema },
  responses: {
    204: {
      description: "The view was deleted.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Delete a project view",
  tags: ["Issue views"],
});

function registerIssueViewRoutes(
  routes: OrganizationRoutes,
  dependencies: OrganizationRouteDependencies,
): void {
  const { issueViews, organizationAccess } = dependencies;

  routes.openapi(listIssueViewsRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId } = context.req.valid("param");
    const query = context.req.valid("query");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const result = await issueViews.list({
      limit: query.limit,
      offset: query.offset,
      organization,
      projectId,
      search: query.search,
    });

    return context.json(issueViewListResponseSchema.parse(result), 200);
  });

  routes.openapi(createIssueViewRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId } = context.req.valid("param");
    const request = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const created = await issueViews.create({ organization, projectId, request });

    return context.json(issueViewResponseSchema.parse({ view: created }), 201);
  });

  routes.openapi(getIssueViewRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId, viewId } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const view = await issueViews.get({ organization, projectId, viewId });

    return context.json(issueViewResponseSchema.parse({ view }), 200);
  });

  routes.openapi(updateIssueViewRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId, viewId } = context.req.valid("param");
    const request = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const updated = await issueViews.update({ organization, projectId, request, viewId });

    return context.json(issueViewResponseSchema.parse({ view: updated }), 200);
  });

  routes.openapi(deleteIssueViewRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId, viewId } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );

    await issueViews.remove({ organization, projectId, viewId });

    return context.body(null, 204);
  });
}

export { registerIssueViewRoutes };
