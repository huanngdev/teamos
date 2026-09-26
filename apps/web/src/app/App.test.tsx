import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { apiUrl } from "@/shared";

import { App } from "./app";
import { renderWithProviders } from "../test/render-app";
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

const providersResponse = {
  providers: [
    { enabled: true, id: "google", name: "Google" },
    { enabled: false, id: "github", name: "GitHub" },
  ],
} as const;

const unauthenticatedResponse = {
  error: {
    code: "UNAUTHENTICATED",
    message: "Authentication is required.",
    requestId: "test-request",
  },
} as const;

test("waits for backend readiness before continuing", async () => {
  server.use(
    http.get(`${apiUrl}/health/ready`, () => new Promise<never>(() => {})),
    http.get(`${apiUrl}/api/me`, () => HttpResponse.json(unauthenticatedResponse, { status: 401 })),
  );

  renderWithProviders(<App />);

  expect(await screen.findByText("Connecting to TeamOS")).toBeInTheDocument();
});

test("redirects unauthenticated visitors to the sign-in page", async () => {
  server.use(
    http.get(`${apiUrl}/health/ready`, () => HttpResponse.json(healthyReadiness)),
    http.get(`${apiUrl}/api/me`, () => HttpResponse.json(unauthenticatedResponse, { status: 401 })),
    http.get(`${apiUrl}/api/authentication/providers`, () => HttpResponse.json(providersResponse)),
  );

  renderWithProviders(<App />);

  expect(await screen.findByText("Sign in to TeamOS")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /Continue with Google/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Continue with GitHub/ })).not.toBeInTheDocument();
});
