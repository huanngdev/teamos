import { createRoute } from "@hono/zod-openapi";
import {
  createProjectRequestSchema,
  organizationSlugSchema,
  projectDetailResponseSchema,
  projectListQuerySchema,
  projectListResponseSchema,
  projectMemberListResponseSchema,
  setProjectMemberRequestSchema,
  updateProjectRequestSchema,
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

const projectMemberParamsSchema = z.object({
  memberId: z.string().min(1).max(200),
  organizationSlug: organizationSlugSchema,
  projectId: z.uuid(),
});

const organizationParamsSchema = z.object({
  organizationSlug: organizationSlugSchema,
});

const listProjectsRoute = createRoute({
  method: "get",
  operationId: "listProjects",
  path: "/{organizationSlug}/projects",
  request: {
    params: organizationParamsSchema,
    query: projectListQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: projectListResponseSchema } },
      description: "Returns the projects visible to the authenticated member.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "List workspace projects",
  tags: ["Projects"],
});

const createProjectRoute = createRoute({
  method: "post",
  operationId: "createProject",
  path: "/{organizationSlug}/projects",
  request: {
    body: {
      content: { "application/json": { schema: createProjectRequestSchema } },
      required: true,
    },
    params: organizationParamsSchema,
  },
  responses: {
    201: {
      content: { "application/json": { schema: projectDetailResponseSchema } },
      description: "The project was created and the creator became its lead.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Create a project",
  tags: ["Projects"],
});

const updateProjectRoute = createRoute({
  method: "patch",
  operationId: "updateProject",
  path: "/{organizationSlug}/projects/{projectId}",
  request: {
    body: {
      content: { "application/json": { schema: updateProjectRequestSchema } },
      required: true,
    },
    params: projectParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: projectDetailResponseSchema } },
      description: "The project was updated.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Update a project",
  tags: ["Projects"],
});

const deleteProjectRoute = createRoute({
  method: "delete",
  operationId: "deleteProject",
  path: "/{organizationSlug}/projects/{projectId}",
  request: {
    params: projectParamsSchema,
  },
  responses: {
    204: {
      description: "The project was deleted.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Delete a project",
  tags: ["Projects"],
});

const listProjectMembersRoute = createRoute({
  method: "get",
  operationId: "listProjectMembers",
  path: "/{organizationSlug}/projects/{projectId}/members",
  request: {
    params: projectParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: projectMemberListResponseSchema } },
      description: "Returns the members with an explicit role on the project.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "List project members",
  tags: ["Projects"],
});

const setProjectMemberRoute = createRoute({
  method: "put",
  operationId: "setProjectMember",
  path: "/{organizationSlug}/projects/{projectId}/members/{memberId}",
  request: {
    body: {
      content: {
        "application/json": {
          schema: setProjectMemberRequestSchema.omit({ memberId: true }),
        },
      },
      required: true,
    },
    params: projectMemberParamsSchema,
  },
  responses: {
    204: {
      description: "The project role was granted or updated.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Grant or update a project role",
  tags: ["Projects"],
});

const removeProjectMemberRoute = createRoute({
  method: "delete",
  operationId: "removeProjectMember",
  path: "/{organizationSlug}/projects/{projectId}/members/{memberId}",
  request: {
    params: projectMemberParamsSchema,
  },
  responses: {
    204: {
      description: "The project role was revoked.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Revoke a project role",
  tags: ["Projects"],
});

function registerProjectRoutes(
  routes: OrganizationRoutes,
  dependencies: OrganizationRouteDependencies,
): void {
  const { organizationAccess, projects } = dependencies;

  routes.openapi(listProjectsRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const { search } = context.req.valid("query");
    const result = await projects.list({ organization, search });

    return context.json(projectListResponseSchema.parse({ projects: result }), 200);
  });

  routes.openapi(createProjectRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug } = context.req.valid("param");
    const request = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const created = await projects.create({ organization, request });

    return context.json(projectDetailResponseSchema.parse({ project: created }), 201);
  });

  routes.openapi(updateProjectRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId } = context.req.valid("param");
    const request = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const updated = await projects.update({ organization, projectId, request });

    return context.json(projectDetailResponseSchema.parse({ project: updated }), 200);
  });

  routes.openapi(deleteProjectRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );

    await projects.remove({ organization, projectId });

    return context.body(null, 204);
  });

  routes.openapi(listProjectMembersRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug, projectId } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const projectMembers = await projects.listMembers({ organization, projectId });

    return context.json(projectMemberListResponseSchema.parse({ members: projectMembers }), 200);
  });

  routes.openapi(setProjectMemberRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { memberId, organizationSlug, projectId } = context.req.valid("param");
    const { role } = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );

    await projects.setMember({
      organization,
      projectId,
      request: { memberId, role },
    });

    return context.body(null, 204);
  });

  routes.openapi(removeProjectMemberRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { memberId, organizationSlug, projectId } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );

    await projects.removeMember({ organization, projectId, targetMemberId: memberId });

    return context.body(null, 204);
  });
}

export {
  createProjectRoute,
  deleteProjectRoute,
  listProjectMembersRoute,
  listProjectsRoute,
  registerProjectRoutes,
  removeProjectMemberRoute,
  setProjectMemberRoute,
  updateProjectRoute,
};
