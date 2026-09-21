import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { RateLimiterLike } from "rate-limiter-flexible";
import { currentUserResponseSchema, updateCurrentUserRequestSchema } from "@teamos/shared";

import {
  createSessionMiddleware,
  getAuthenticatedSession,
  toCurrentUserResponse,
  type AuthService,
} from "@/auth/index.js";
import type { Env } from "@/config/index.js";
import { createRateLimitMiddleware } from "@/middleware/index.js";
import {
  apiErrorResponses,
  protectedRouteErrorResponses,
  requestIdHeaders,
} from "@/openapi/index.js";
import type { UserProfileService } from "@/services/index.js";
import type { AppEnv } from "@/types.js";

const currentUserRoute = createRoute({
  method: "get",
  operationId: "getCurrentUser",
  path: "/",
  responses: {
    200: {
      content: { "application/json": { schema: currentUserResponseSchema } },
      description: "Returns the authenticated user and their current session.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Get the authenticated user",
  tags: ["Authentication"],
});

const updateCurrentUserRoute = createRoute({
  method: "patch",
  operationId: "updateCurrentUser",
  path: "/",
  request: {
    body: {
      content: { "application/json": { schema: updateCurrentUserRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: currentUserResponseSchema } },
      description: "Returns the updated user and the unchanged session.",
      headers: requestIdHeaders,
    },
    ...protectedRouteErrorResponses,
    ...apiErrorResponses,
  },
  security: [{ sessionCookie: [] }],
  summary: "Update the authenticated user's profile",
  tags: ["Authentication"],
});

interface CurrentUserRouteDependencies {
  auth: AuthService;
  env: Env;
  managementRateLimiter: RateLimiterLike;
  profile: UserProfileService;
}

/*
 * This is the browser's sanitized session source. It intentionally accepts an
 * unverified session and reports `emailVerified` so the client can route the
 * user to verification; every tenant-scoped route still enforces verification
 * and authorization on the server.
 */
function createCurrentUserRoutes(options: CurrentUserRouteDependencies) {
  const routes = new OpenAPIHono<AppEnv>();

  routes.use("*", createSessionMiddleware(options.auth));
  /*
   * The read endpoint runs on every session check, so the management limiter is
   * restricted to the sensitive mutation. It is keyed by the authenticated actor
   * so one user cannot consume another user's budget.
   */
  routes.use(
    "*",
    createRateLimitMiddleware({
      enabled: options.env.RATE_LIMIT_ENABLED,
      key: (context) => {
        const session = context.get("authSession");

        return session === null ? `ip:${context.get("clientIp")}` : `user:${session.user.id}`;
      },
      limiter: options.managementRateLimiter,
      methods: ["PATCH"],
      points: options.env.MANAGEMENT_RATE_LIMIT_POINTS,
    }),
  );

  routes.openapi(currentUserRoute, (context) => {
    const session = getAuthenticatedSession(context);

    return context.json(currentUserResponseSchema.parse(toCurrentUserResponse(session)), 200);
  });

  routes.openapi(updateCurrentUserRoute, async (context) => {
    const session = getAuthenticatedSession(context);
    const { name } = context.req.valid("json");
    const result = await options.profile.updateProfile({
      headers: context.req.raw.headers,
      name,
      userId: session.user.id,
    });
    const response = context.json(
      currentUserResponseSchema.parse({
        session: {
          activeOrganizationId: session.session.activeOrganizationId ?? null,
          expiresAt: session.session.expiresAt.toISOString(),
          id: session.session.id,
        },
        user: result.user,
      }),
      200,
    );

    /* Better Auth can refresh the session cookie, so its headers are forwarded. */
    for (const cookie of result.headers.getSetCookie()) {
      response.headers.append("set-cookie", cookie);
    }

    return response;
  });

  return routes;
}

export { createCurrentUserRoutes, currentUserRoute, updateCurrentUserRoute };
