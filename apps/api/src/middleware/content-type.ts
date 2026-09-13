import { createMiddleware } from "hono/factory";

import { AppError } from "@/errors/index.js";
import type { AppEnv } from "@/types.js";

const bodyMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hasRequestBody(request: Request): boolean {
  if (request.body !== null) {
    return true;
  }

  const contentLength = request.headers.get("content-length");
  return contentLength !== null && contentLength !== "0";
}

function isSupportedContentType(contentType: string): boolean {
  const mimeType = contentType.split(";", 1)[0]?.trim().toLowerCase();

  return (
    mimeType === "application/json" ||
    (mimeType?.startsWith("application/") === true && mimeType.endsWith("+json")) ||
    mimeType === "application/x-www-form-urlencoded" ||
    mimeType === "multipart/form-data" ||
    mimeType === "text/plain"
  );
}

const contentType = createMiddleware<AppEnv>(async (context, next) => {
  if (
    bodyMethods.has(context.req.method) &&
    hasRequestBody(context.req.raw) &&
    !isSupportedContentType(context.req.header("content-type") ?? "")
  ) {
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "The request Content-Type is not supported.");
  }

  await next();
});

export { contentType };
