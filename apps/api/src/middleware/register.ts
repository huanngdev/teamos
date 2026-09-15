import { honoLogLayer } from "@loglayer/hono";
import type { ILogLayer } from "loglayer";
import type { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import type { RateLimiterLike } from "rate-limiter-flexible";

import type { Env } from "@/config/index.js";
import { AppError } from "@/errors/index.js";
import { clientIp } from "@/middleware/client-ip.js";
import { contentType } from "@/middleware/content-type.js";
import { createRateLimitMiddleware } from "@/middleware/rate-limit.js";
import { createRequestLoggingMiddleware } from "@/middleware/request-logging.js";
import { requestIdHeader } from "@/middleware/request-id.js";
import type { AppEnv } from "@/types.js";

interface RegisterMiddlewareOptions {
  env: Env;
  logger: ILogLayer;
  rateLimiter: RateLimiterLike;
}

function registerGlobalMiddleware(app: Hono<AppEnv>, options: RegisterMiddlewareOptions): void {
  app.use(
    "*",
    cors({
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "Idempotency-Key",
        "X-CSRF-Token",
        "X-Request-ID",
      ],
      allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      exposeHeaders: [
        "X-Request-ID",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
        "Retry-After",
      ],
      maxAge: 600,
      origin: options.env.CORS_ORIGINS,
    }),
  );
  app.use(
    "*",
    secureHeaders({
      crossOriginResourcePolicy: "same-origin",
      strictTransportSecurity:
        options.env.NODE_ENV === "production" ? "max-age=31536000; includeSubDomains" : false,
      xFrameOptions: "DENY",
    }),
  );
  app.use(
    "*",
    requestId({
      generator: () => crypto.randomUUID(),
      limitLength: 128,
    }),
  );
  app.use("*", requestIdHeader);
  app.use("*", clientIp);
  app.use(
    "*",
    honoLogLayer({
      autoLogging: false,
      instance: options.logger,
      requestId: false,
    }),
  );
  app.use("*", createRequestLoggingMiddleware(options.logger));
  app.use("*", contentType);
  app.use(
    "*",
    bodyLimit({
      maxSize: options.env.MAX_REQUEST_BODY_BYTES,
      onError: () => {
        throw new AppError(413, "REQUEST_BODY_TOO_LARGE", "The request body is too large.");
      },
    }),
  );
  app.use(
    "*",
    timeout(options.env.REQUEST_TIMEOUT_MS, () => {
      return new HTTPException(408, {
        message: "The request timed out.",
      });
    }),
  );
  app.use("*", csrf({ origin: options.env.CORS_ORIGINS }));
  app.use(
    "*",
    createRateLimitMiddleware({
      enabled: options.env.RATE_LIMIT_ENABLED,
      limiter: options.rateLimiter,
      points: options.env.RATE_LIMIT_POINTS,
    }),
  );
}

export { registerGlobalMiddleware };
