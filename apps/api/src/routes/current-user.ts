import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { currentUserResponseSchema } from "@teamos/shared";

import {
  createRequireVerifiedSessionMiddleware,
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

function createCurrentUserRoutes(auth: AuthService) {
  const routes = new OpenAPIHono<AppEnv>();

  routes.use("*", createSessionMiddleware(auth), createRequireVerifiedSessionMiddleware());
  routes.openapi(currentUserRoute, (context) => {
    const session = getAuthenticatedSession(context);

    return context.json(currentUserResponseSchema.parse(toCurrentUserResponse(session)), 200);
  });

  return routes;
}

export { createCurrentUserRoutes, currentUserRoute };
