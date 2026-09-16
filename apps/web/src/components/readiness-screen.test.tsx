import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { BackendReadinessState } from "@/hooks/use-backend-readiness";

import { ReadinessScreen } from "./readiness-screen";

const unavailableState: Extract<BackendReadinessState, { status: "error" }> = {
  errorMessage: "The API is reachable, but Redis is not ready.",
  isRetrying: false,
  readiness: {
    dependencies: {
      database: { status: "ok" },
      redis: { status: "error" },
      storage: { status: "ok" },
    },
    service: "api",
    status: "error",
    timestamp: "2026-01-02T03:04:05.000Z",
  },
  status: "error",
};

test("shows loading state while checking the backend", () => {
  render(<ReadinessScreen state={{ isRetrying: true, status: "loading" }} onRetry={vi.fn()} />);

  expect(screen.getByText("Connecting to TeamOS")).toBeInTheDocument();
  expect(screen.getByLabelText("Checking backend services")).toBeInTheDocument();
});

test("shows dependency failures and retries on request", () => {
  const onRetry = vi.fn();

  render(<ReadinessScreen state={unavailableState} onRetry={onRetry} />);

  expect(screen.getByText("Backend not ready")).toBeInTheDocument();
  expect(screen.getByText("error")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalledOnce();
});
