import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { healthStatusSchema, readinessStatusSchema } from "@teamos/shared";

import { apiErrorResponses, requestIdHeaders } from "@/openapi/index.js";
import { getHealthStatus } from "@/services/index.js";
import { createUnavailableReadinessService, type ReadinessService } from "@/services/index.js";
import type { AppEnv } from "@/types.js";

const healthRoute = createRoute({
  method: "get",
  operationId: "getHealth",
  path: "/",
  responses: {
    200: {
      content: { "application/json": { schema: healthStatusSchema } },
      description: "Returns API liveness.",
      headers: requestIdHeaders,
    },
    ...apiErrorResponses,
  },
  summary: "Get API liveness",
  tags: ["System"],
});

const readinessRoute = createRoute({
  method: "get",
  operationId: "getReadiness",
  path: "/ready",
  responses: {
    ...apiErrorResponses,
    200: {
      content: { "application/json": { schema: readinessStatusSchema } },
      description: "All required service dependencies are ready.",
      headers: requestIdHeaders,
    },
    503: {
      content: { "application/json": { schema: readinessStatusSchema } },
      description: "At least one required service dependency is unavailable.",
      headers: requestIdHeaders,
    },
  },
  summary: "Get API readiness",
  tags: ["System"],
});

function createHealthRoutes(readiness: ReadinessService = createUnavailableReadinessService()) {
  return new OpenAPIHono<AppEnv>()
    .openapi(healthRoute, (context) => {
      return context.json(getHealthStatus(), 200);
    })
    .openapi(readinessRoute, async (context) => {
      const status = await readiness.check();

      if (status.status === "ok") {
        return context.json(status, 200);
      }

      return context.json(status, 503);
    });
}

const healthRoutes = createHealthRoutes();

export { createHealthRoutes, healthRoutes };
