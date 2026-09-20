import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { socialProvidersResponseSchema } from "@teamos/shared";

import { getEnabledSocialProviders } from "@/auth/index.js";
import type { Env } from "@/config/index.js";
import { apiErrorResponses, requestIdHeaders } from "@/openapi/index.js";
import type { AppEnv } from "@/types.js";

const socialProvidersRoute = createRoute({
  method: "get",
  operationId: "getSocialProviders",
  path: "/providers",
  responses: {
    200: {
      content: { "application/json": { schema: socialProvidersResponseSchema } },
      description: "Returns the social sign-in providers that are configured on the server.",
      headers: requestIdHeaders,
    },
    ...apiErrorResponses,
  },
  summary: "Get enabled social sign-in providers",
  tags: ["Authentication"],
});

function createAuthenticationRoutes(env: Env) {
  return new OpenAPIHono<AppEnv>().openapi(socialProvidersRoute, (context) => {
    const response = socialProvidersResponseSchema.parse({
      providers: getEnabledSocialProviders(env),
    });

    return context.json(response, 200);
  });
}

export { createAuthenticationRoutes, socialProvidersRoute };
