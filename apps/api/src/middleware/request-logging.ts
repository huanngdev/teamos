import { createMiddleware } from "hono/factory";
import type { ILogLayer } from "loglayer";

import type { AppEnv } from "@/types.js";

function createRequestLoggingMiddleware(baseLogger: ILogLayer) {
  return createMiddleware<AppEnv>(async (context, next) => {
    const requestId = context.get("requestId");
    const requestLogger = (context.var.logger ?? baseLogger.child()).withContext({
      clientIp: context.get("clientIp"),
      requestId,
    });

    context.set("logger", requestLogger);
    context.set("requestStartedAt", Date.now());
    requestLogger
      .withMetadata({
        req: {
          method: context.req.method,
          url: context.req.path,
        },
      })
      .info("incoming request");

    await next();

    requestLogger
      .withMetadata({
        req: {
          method: context.req.method,
          url: context.req.path,
        },
        res: {
          statusCode: context.res.status,
        },
        responseTime: Date.now() - context.get("requestStartedAt"),
      })
      .info("request completed");
  });
}

export { createRequestLoggingMiddleware };
