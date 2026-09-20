import { OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "@/types.js";

/*
 * Route validation failures must use the TeamOS error contract. The library
 * default replies with its own 400 body, so the hook rethrows the Zod error and
 * lets the shared error handler answer with a 422 `VALIDATION_ERROR`.
 */
function createOpenApiRouter(): OpenAPIHono<AppEnv> {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result) => {
      if (!result.success) {
        throw result.error;
      }
    },
  });
}

export { createOpenApiRouter };
