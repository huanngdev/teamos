import { createMiddleware } from "hono/factory";

import type { AppEnv } from "@/types.js";

const clientIp = createMiddleware<AppEnv>(async (context, next) => {
  context.set("clientIp", context.env?.clientIp ?? "unknown");
  await next();
});

export { clientIp };
