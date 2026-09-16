// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { StrictMode } from "react";
import { expect, test } from "vitest";

import { apiUrl } from "@/lib/env";
import { server } from "@/test/server";

import { useBackendReadiness } from "./use-backend-readiness";

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

function ReadinessProbe() {
  const readiness = useBackendReadiness();

  return <p>{readiness.status}</p>;
}

/*
 * React StrictMode mounts and remounts effects in development. Consuming the
 * TanStack Query abort signal inside the query function makes the remount
 * cancel the in-flight request and start a duplicate one.
 */
test("requests readiness once while React StrictMode remounts", async () => {
  let requestCount = 0;
  server.use(
    http.get(`${apiUrl}/health/ready`, () => {
      requestCount += 1;
      return HttpResponse.json(healthyReadiness);
    }),
  );

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ReadinessProbe />
      </QueryClientProvider>
    </StrictMode>,
  );

  expect(await screen.findByText("ready")).toBeInTheDocument();
  expect(requestCount).toBe(1);
});
