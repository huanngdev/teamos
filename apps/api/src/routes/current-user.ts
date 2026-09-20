import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { currentUserResponseSchema } from "@teamos/shared";

import {
  createSessionMiddleware,
  getAuthenticatedSession,
  toCurrentUserResponse,
  type AuthService,
} from "@/auth/index.js";
import {
  apiErrorResponses,
  protectedRouteErrorResponses,
  requestIdHeaders,
} from "@/openapi/index.js";
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

/*
 * This is the browser's sanitized session source. It intentionally accepts an
 * unverified session and reports `emailVerified` so the client can route the
 * user to verification; every tenant-scoped route still enforces verification
 * and authorization on the server.
 */
function createCurrentUserRoutes(auth: AuthService) {
  const routes = new OpenAPIHono<AppEnv>();

  routes.use("*", createSessionMiddleware(auth));
  routes.openapi(currentUserRoute, (context) => {
    const session = getAuthenticatedSession(context);

    return context.json(currentUserResponseSchema.parse(toCurrentUserResponse(session)), 200);
  });

  return routes;
}

export { createCurrentUserRoutes, currentUserRoute };
