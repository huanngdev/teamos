import { createMiddleware } from "hono/factory";

import type { AppEnv } from "@/types.js";

const requestIdHeader = createMiddleware<AppEnv>(async (context, next) => {
  context.header("X-Request-ID", context.get("requestId"));
  await next();
});

export { requestIdHeader };
