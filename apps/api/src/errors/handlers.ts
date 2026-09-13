import type { ILogLayer } from "loglayer";
import type { Context, Hono } from "hono";
import { apiErrorResponseSchema, type ApiErrorCode } from "@teamos/shared";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";

import { AppError } from "@/errors/http-error.js";
import type { AppEnv } from "@/types.js";

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

function registerErrorHandlers(app: Hono<AppEnv>, logger: ILogLayer): void {
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
}

export { createErrorResponse, getErrorInfo, registerErrorHandlers };
