import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { apiUrl } from "@/shared/api/env";

import { getReadiness, ReadinessUnavailableError } from "./health-api";
import { server } from "@/test/server";

const healthyReadiness = {
  dependencies: {
    database: { status: "ok" },
    redis: { status: "ok" },
    storage: { status: "ok" },
  },
  service: "api",
  status: "ok",
  timestamp: "2026-01-02T03:04:05.000Z",
} as const;

test("parses a healthy readiness response", async () => {
  server.use(http.get(`${apiUrl}/health/ready`, () => HttpResponse.json(healthyReadiness)));

  await expect(getReadiness()).resolves.toEqual(healthyReadiness);
});

test("preserves dependency details when readiness is unavailable", async () => {
  const unavailableReadiness = {
    ...healthyReadiness,
    dependencies: {
      ...healthyReadiness.dependencies,
      redis: { status: "error" },
    },
    status: "error",
  } as const;
  server.use(
    http.get(`${apiUrl}/health/ready`, () =>
      HttpResponse.json(unavailableReadiness, { status: 503 }),
    ),
  );

  await expect(getReadiness()).rejects.toBeInstanceOf(ReadinessUnavailableError);
});

test("rejects malformed readiness payloads", async () => {
  server.use(http.get(`${apiUrl}/health/ready`, () => HttpResponse.json({ status: "ok" })));

  await expect(getReadiness()).rejects.toMatchObject({
    kind: "invalid-response",
  });
});
