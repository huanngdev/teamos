import { honoLogLayer } from "@loglayer/hono";
import type { ILogLayer } from "loglayer";
import { Hono, type Context } from "hono";
import { apiErrorResponseSchema, type ApiErrorCode } from "@teamos/shared";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { ZodError } from "zod";

import type { Env } from "@/config/index.js";
import { AppError } from "@/errors/index.js";
import {
  clientIp,
  contentType,
  createRateLimitMiddleware,
  createRequestLoggingMiddleware,
  requestIdHeader,
} from "@/middleware/index.js";
import { createLogger } from "@/logging/index.js";
import { healthRoutes, rootRoutes } from "@/routes/index.js";
import type { RateLimiterLike } from "rate-limiter-flexible";
import type { AppEnv } from "@/types.js";

interface CreateAppOptions {
  env: Env;
  logger?: ILogLayer;
  rateLimiter?: RateLimiterLike;
}

interface ErrorInfo {
  code: ApiErrorCode;
  details?: readonly unknown[];
  message: string;
  status: ContentfulStatusCode;
}

const contentfulStatusCodes = new Set<number>([
  400, 401, 403, 404, 405, 406, 408, 409, 410, 412, 413, 415, 422, 429, 500, 501, 502, 503, 504,
]);

function isContentfulStatusCode(status: number): status is ContentfulStatusCode {
  return contentfulStatusCodes.has(status);
}

function toContentfulStatusCode(status: number): ContentfulStatusCode {
  if (isContentfulStatusCode(status)) {
    return status;
  }

  return 500;
}

function getErrorInfo(error: unknown): ErrorInfo {
  if (error instanceof AppError) {
    return {
      code: error.code,
      details: error.details,
      message: error.message,
      status: error.status,
    };
  }

  if (error instanceof ZodError) {
    return {
      code: "VALIDATION_ERROR",
      details: error.issues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path,
      })),
      message: "The request is invalid.",
      status: 422,
    };
  }

  if (error instanceof HTTPException) {
    const status = toContentfulStatusCode(error.status);
    const isMalformedJson = status === 400 && error.message === "Malformed JSON in request body";

    return {
      code: isMalformedJson ? "INVALID_JSON" : status === 408 ? "REQUEST_TIMEOUT" : "HTTP_ERROR",
      message: status >= 500 ? "Internal server error." : error.message,
      status,
    };
  }

  if (error instanceof SyntaxError) {
    return {
      code: "INVALID_JSON",
      message: "The request body contains invalid JSON.",
      status: 400,
    };
  }

  return {
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error.",
    status: 500,
  };
}

function createErrorResponse(context: Context<AppEnv>, info: ErrorInfo) {
  const response = apiErrorResponseSchema.parse({
    error: {
      code: info.code,
      ...(info.details === undefined ? {} : { details: info.details }),
      message: info.message,
      requestId: context.get("requestId"),
    },
  });

  return context.json(response, info.status);
}

function createApp(options: CreateAppOptions): Hono<AppEnv> {
  const logger = options.logger ?? createLogger(options.env);
  const rateLimiter =
    options.rateLimiter ??
    new RateLimiterMemory({
      duration: options.env.RATE_LIMIT_DURATION_SECONDS,
      points: options.env.RATE_LIMIT_POINTS,
    });
  const app = new Hono<AppEnv>();

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
      instance: logger,
      requestId: false,
    }),
  );
  app.use("*", createRequestLoggingMiddleware(logger));
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
      limiter: rateLimiter,
      points: options.env.RATE_LIMIT_POINTS,
    }),
  );

  app.route("/", rootRoutes);
  app.route("/health", healthRoutes);

  app.notFound((context) => {
    return createErrorResponse(context, {
      code: "NOT_FOUND",
      message: "The requested resource was not found.",
      status: 404,
    });
  });

  app.onError((error, context) => {
    const info = getErrorInfo(error);
    const requestStartedAt = context.get("requestStartedAt") ?? Date.now();

    (context.var.logger ?? logger)
      .withError(error)
      .withMetadata({
        req: {
          method: context.req.method,
          url: context.req.path,
        },
        res: {
          statusCode: info.status,
        },
        responseTime: Date.now() - requestStartedAt,
      })
      .error("request failed");

    return createErrorResponse(context, info);
  });

  return app;
}

export { createApp };
