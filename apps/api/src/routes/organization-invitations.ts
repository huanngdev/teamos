import { createRoute } from "@hono/zod-openapi";
import {
  createInvitationRequestSchema,
  invitationListResponseSchema,
  invitationResponseSchema,
  organizationSlugSchema,
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

const invitationParamsSchema = z.object({
  invitationId: z.string().min(1).max(200),
  organizationSlug: organizationSlugSchema,
});

const listInvitationsRoute = createRoute({
  method: "get",
  operationId: "listOrganizationInvitations",
  path: "/{organizationSlug}/invitations",
  request: {
    params: organizationParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: invitationListResponseSchema } },
      description: "Returns the pending invitations for the workspace.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "List pending workspace invitations",
  tags: ["Organizations"],
});

const createInvitationRoute = createRoute({
  method: "post",
  operationId: "createOrganizationInvitation",
  path: "/{organizationSlug}/invitations",
  request: {
    body: {
      content: { "application/json": { schema: createInvitationRequestSchema } },
      required: true,
    },
    params: organizationParamsSchema,
  },
  responses: {
    201: {
      content: { "application/json": { schema: invitationResponseSchema } },
      description: "The invitation was created and the email was handed to the provider.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Invite a member to the workspace",
  tags: ["Organizations"],
});

const resendInvitationRoute = createRoute({
  method: "post",
  operationId: "resendOrganizationInvitation",
  path: "/{organizationSlug}/invitations/{invitationId}/resend",
  request: {
    params: invitationParamsSchema,
  },
  responses: {
    201: {
      content: { "application/json": { schema: invitationResponseSchema } },
      description: "A new invitation replaced the previous pending invitation.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Resend a workspace invitation",
  tags: ["Organizations"],
});

const cancelInvitationRoute = createRoute({
  method: "delete",
  operationId: "cancelOrganizationInvitation",
  path: "/{organizationSlug}/invitations/{invitationId}",
  request: {
    params: invitationParamsSchema,
  },
  responses: {
    204: {
      description: "The invitation was cancelled.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Cancel a workspace invitation",
  tags: ["Organizations"],
});

function registerOrganizationInvitationRoutes(
  routes: OrganizationRoutes,
  dependencies: OrganizationRouteDependencies,
): void {
  const { management, organizationAccess } = dependencies;

  routes.openapi(listInvitationsRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const invitations = await management.listPendingInvitations({
      headers: context.req.raw.headers,
      organization,
    });

    return context.json(invitationListResponseSchema.parse({ invitations }), 200);
  });

  routes.openapi(createInvitationRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { organizationSlug } = context.req.valid("param");
    const request = context.req.valid("json");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const invitation = await management.createInvitation({
      headers: context.req.raw.headers,
      organization,
      request,
    });

    return context.json(invitationResponseSchema.parse({ invitation }), 201);
  });

  routes.openapi(resendInvitationRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { invitationId, organizationSlug } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );
    const invitation = await management.resendInvitation({
      headers: context.req.raw.headers,
      invitationId,
      organization,
    });

    return context.json(invitationResponseSchema.parse({ invitation }), 201);
  });

  routes.openapi(cancelInvitationRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { invitationId, organizationSlug } = context.req.valid("param");
    const organization = await requireOrganizationAccess(
      organizationAccess,
      organizationSlug,
      session.user.id,
    );

    await management.cancelInvitation({
      headers: context.req.raw.headers,
      invitationId,
      organization,
    });

    return context.body(null, 204);
  });
}

export {
  cancelInvitationRoute,
  createInvitationRoute,
  listInvitationsRoute,
  registerOrganizationInvitationRoutes,
  resendInvitationRoute,
};
