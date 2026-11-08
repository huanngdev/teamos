import { HTTPException } from "hono/http-exception";
import { expect, test } from "bun:test";
import { z, ZodError } from "zod";

import { AppError } from "@/errors/index.js";
import { getErrorInfo } from "@/errors/handlers.js";

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
