import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { rootResponseSchema } from "@teamos/shared";

import { apiErrorResponses, requestIdHeaders } from "@/openapi/index.js";
import type { AppEnv } from "@/types.js";

const rootRoute = createRoute({
  method: "get",
  operationId: "getApiRoot",
  path: "/",
  responses: {
    200: {
      content: { "application/json": { schema: rootResponseSchema } },
      description: "Returns the API identity and liveness status.",
      headers: requestIdHeaders,
    },
    ...apiErrorResponses,
  },
  summary: "Get API status",
  tags: ["System"],
});

const rootRoutes = new OpenAPIHono<AppEnv>().openapi(rootRoute, (context) => {
  const response = rootResponseSchema.parse({
    name: "TeamOS API",
    status: "ok",
  });

  return context.json(response, 200);
});

export { rootRoutes };
