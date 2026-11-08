import { expect, test } from "bun:test";

import {
  getHealthStatus,
  getReadinessStatus,
  healthStatusSchema,
  readinessStatusSchema,
} from "./health.js";

test("creates a valid health response", () => {
  const result = getHealthStatus(new Date("2026-01-02T03:04:05.000Z"));

  expect(result).toEqual({
    service: "api",
    status: "ok",
    timestamp: "2026-01-02T03:04:05.000Z",
  });
  expect(healthStatusSchema.safeParse(result).success).toBe(true);
});

test("creates a valid readiness response from dependency statuses", () => {
  const result = getReadinessStatus(
    {
      database: { status: "ok" },
      redis: { status: "error" },
      storage: { status: "ok" },
    },
    new Date("2026-01-02T03:04:05.000Z"),
  );

  expect(result.status).toBe("error");
  expect(readinessStatusSchema.safeParse(result).success).toBe(true);
});
