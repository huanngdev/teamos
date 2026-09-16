import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, test } from "vitest";

import { ThemeProvider } from "@/components/theme-provider";
import { apiUrl } from "@/lib/env";

import { App } from "./App";
import { server } from "../test/server";

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

test("waits for backend readiness before rendering the home route", async () => {
  server.use(http.get(`${apiUrl}/health/ready`, () => HttpResponse.json(healthyReadiness)));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );

  expect(screen.queryByText("Workspace ready")).not.toBeInTheDocument();
  expect(screen.getByText("Connecting to TeamOS")).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText("Workspace ready")).toBeInTheDocument();
  });
});
