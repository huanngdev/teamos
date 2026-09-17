// @vitest-environment jsdom

import { beforeEach, expect, test } from "vitest";

import {
  readRecentWorkspaceSlug,
  writeRecentWorkspaceSlug,
} from "@/features/workspaces/lib/recent-workspace-storage";

beforeEach(() => {
  window.localStorage.clear();
});

test("remembers a workspace per user", () => {
  writeRecentWorkspaceSlug("user-1", "acme");
  writeRecentWorkspaceSlug("user-2", "difference");

  expect(readRecentWorkspaceSlug("user-1")).toBe("acme");
  expect(readRecentWorkspaceSlug("user-2")).toBe("difference");
});

test("returns null for a user without a remembered workspace", () => {
  expect(readRecentWorkspaceSlug("user-3")).toBeNull();
});

test("keeps the remembered workspace after a sign-out", () => {
  writeRecentWorkspaceSlug("user-1", "acme");

  /* `queryClient.clear()` runs on sign-out; storage must survive it. */
  window.localStorage.setItem("unrelated", "value");

  expect(readRecentWorkspaceSlug("user-1")).toBe("acme");
});
