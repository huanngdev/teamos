import { describe, expect, test } from "vitest";

import type { OrganizationSummary } from "@teamos/shared";

import { resolveWorkspaceDestination } from "./resolve-workspace-destination";

function organization(
  overrides: Partial<OrganizationSummary> & { id: string; slug: string },
): OrganizationSummary {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    logo: null,
    name: overrides.slug,
    ...overrides,
  };
}

const older = organization({
  createdAt: "2025-01-01T00:00:00.000Z",
  id: "org-1",
  slug: "older",
});
const newest = organization({
  createdAt: "2026-03-01T00:00:00.000Z",
  id: "org-3",
  slug: "newest",
});
const middle = organization({
  createdAt: "2026-02-01T00:00:00.000Z",
  id: "org-2",
  slug: "middle",
});

describe("resolveWorkspaceDestination", () => {
  test("sends a user with no workspaces to creation", () => {
    expect(resolveWorkspaceDestination([], null)).toEqual({ kind: "create" });
  });

  test("uses the remembered workspace when the user is still a member", () => {
    expect(resolveWorkspaceDestination([older, middle, newest], "middle")).toEqual({
      kind: "recent",
      slug: "middle",
    });
  });

  test("falls back to the newest workspace when nothing is remembered", () => {
    expect(resolveWorkspaceDestination([older, middle, newest], null)).toEqual({
      kind: "newest",
      slug: "newest",
    });
  });

  test("ignores a remembered workspace the user no longer belongs to", () => {
    expect(resolveWorkspaceDestination([older, middle], "removed")).toEqual({
      kind: "newest",
      slug: "middle",
    });
  });

  test("does not depend on the order returned by the API", () => {
    expect(resolveWorkspaceDestination([newest, older, middle], null)).toEqual({
      kind: "newest",
      slug: "newest",
    });
  });

  test("breaks a createdAt tie with the id so the order stays stable", () => {
    const sameTimestampA = organization({
      createdAt: "2026-03-01T00:00:00.000Z",
      id: "org-a",
      slug: "a",
    });
    const sameTimestampB = organization({
      createdAt: "2026-03-01T00:00:00.000Z",
      id: "org-b",
      slug: "b",
    });

    expect(resolveWorkspaceDestination([sameTimestampA, sameTimestampB], null)).toEqual({
      kind: "newest",
      slug: "b",
    });
    expect(resolveWorkspaceDestination([sameTimestampB, sameTimestampA], null)).toEqual({
      kind: "newest",
      slug: "b",
    });
  });
});
