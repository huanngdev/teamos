import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { LogLayer, TestLoggingLibrary, TestTransport } from "loglayer";
import { expect, test } from "vitest";
import { z, ZodError } from "zod";

import { AppError, getErrorInfo, registerErrorHandlers } from "@/errors/index.js";
import type { AppEnv } from "@/types.js";

function createRecordingApp() {
  const loggingLibrary = new TestLoggingLibrary();
  const logger = new LogLayer({
    transport: new TestTransport({ logger: loggingLibrary }),
  });
  const app = new Hono<AppEnv>();

  app.use(async (context, next) => {
    context.set("requestId", "test-request-id");
    context.set("requestStartedAt", Date.now());
    await next();
  });
  registerErrorHandlers(app, logger);

  return { app, loggingLibrary };
}

test("normalizes application errors without changing their contract", () => {
  const error = new AppError(409, "HTTP_ERROR", "The resource already exists.", ["resource"]);

  expect(getErrorInfo(error)).toEqual({
    code: "HTTP_ERROR",
    details: ["resource"],
    message: "The resource already exists.",
    status: 409,
  });
});

test("normalizes Zod errors into safe validation details", () => {
  const result = z.object({ name: z.string() }).safeParse({});

  expect(result.success).toBe(false);
  if (result.success) {
    throw new Error("Expected validation to fail.");
  }

  expect(getErrorInfo(new ZodError(result.error.issues))).toMatchObject({
    code: "VALIDATION_ERROR",
    message: "The request is invalid.",
    status: 422,
  });
});

test("maps HTTP and unexpected errors to public-safe responses", () => {
  expect(getErrorInfo(new HTTPException(408, { message: "The request timed out." }))).toEqual({
    code: "REQUEST_TIMEOUT",
    message: "The request timed out.",
    status: 408,
  });
  expect(getErrorInfo(new Error("private implementation detail"))).toEqual({
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error.",
    status: 500,
  });
});

test("logs a rejected 401 as a warning without a stack trace", async () => {
  const { app, loggingLibrary } = createRecordingApp();
  app.get("/api/me", () => {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  });

  const response = await app.request("/api/me");

  expect(response.status).toBe(401);
  expect(loggingLibrary.lines).toHaveLength(1);
  const line = loggingLibrary.getLastLine();
  expect(line?.level).toBe("warn");
  const [metadata] = line?.data ?? [];
  expect(metadata).toMatchObject({
    req: { method: "GET", url: "/api/me" },
    res: { statusCode: 401 },
    error: { code: "UNAUTHENTICATED" },
  });
  expect(metadata).not.toHaveProperty("err");
});

test("logs an unexpected 500 as an error with the serialized stack trace", async () => {
  const { app, loggingLibrary } = createRecordingApp();
  app.get("/failure", () => {
    throw new Error("private implementation detail");
  });

  const response = await app.request("/failure");

  expect(response.status).toBe(500);
  expect(loggingLibrary.lines).toHaveLength(1);
  const line = loggingLibrary.getLastLine();
  expect(line?.level).toBe("error");
  const [metadata] = line?.data ?? [];
  expect(metadata).toMatchObject({
    req: { method: "GET", url: "/failure" },
    res: { statusCode: 500 },
  });
  // Only a server fault carries the error itself, which in production serializes the stack.
  expect(metadata).toHaveProperty("err");
});
