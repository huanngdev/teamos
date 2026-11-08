import { expect, test } from "bun:test";

import { apiErrorResponseSchema } from "./api-error.js";

test("accepts the public API error contract", () => {
  const result = apiErrorResponseSchema.safeParse({
    error: {
      code: "VALIDATION_ERROR",
      details: [{ message: "Required", path: ["name"] }],
      message: "The request is invalid.",
      requestId: "request-123",
    },
  });

  expect(result.success).toBe(true);
});

test("rejects unknown public error codes", () => {
  const result = apiErrorResponseSchema.safeParse({
    error: {
      code: "DATABASE_PASSWORD",
      message: "Internal server error.",
      requestId: "request-123",
    },
  });

  expect(result.success).toBe(false);
});
