import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { ReactNode } from "react";

import { createTestQueryClient } from "../../../support/render-app";

import { useWorkspaceMembers } from "@/features/members/hooks/use-workspace-members";

const listMembers = vi.hoisted(() =>
  vi.fn(async () => ({
    members: [],
    pagination: { limit: 25, offset: 0, total: 0 },
  })),
);

vi.mock("@/features/members/api/organization-members-api", () => ({
  listOrganizationMembers: listMembers,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

test("resets pagination once the debounced search settles", () => {
  const { result } = renderHook(
    () => useWorkspaceMembers({ enabled: true, organizationSlug: "acme" }),
    { wrapper },
  );

  act(() => {
    result.current.setPage(3);
  });
  expect(result.current.page).toBe(3);

  act(() => {
    result.current.setSearchInput("alice");
  });
  expect(result.current.searchIsSettling).toBe(true);
  expect(result.current.page).toBe(3);

  act(() => {
    vi.advanceTimersByTime(300);
  });
  expect(result.current.searchIsSettling).toBe(false);
  expect(result.current.page).toBe(0);
});

test("keeps the page when only the page changes", () => {
  const { result } = renderHook(
    () => useWorkspaceMembers({ enabled: true, organizationSlug: "acme" }),
    { wrapper },
  );

  act(() => {
    result.current.setPage(2);
  });
  act(() => {
    vi.advanceTimersByTime(1000);
  });

  expect(result.current.page).toBe(2);
});
