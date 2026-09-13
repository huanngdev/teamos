import { expect, test } from "bun:test";

import { getHealthStatus, healthStatusSchema } from "./health.js";

test("creates a valid health response", () => {
  const result = getHealthStatus(new Date("2026-01-02T03:04:05.000Z"));

  expect(result).toEqual({
    service: "api",
    status: "ok",
    timestamp: "2026-01-02T03:04:05.000Z",
  });
  expect(healthStatusSchema.safeParse(result).success).toBe(true);
});
