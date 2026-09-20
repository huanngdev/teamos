import { describe, expect, test } from "bun:test";

import {
  deleteOrganizationRequestSchema,
  organizationContextSchema,
  updateOrganizationRequestSchema,
} from "./organization.js";

describe("updateOrganizationRequestSchema", () => {
  test("trims the submitted name", () => {
    expect(updateOrganizationRequestSchema.parse({ name: "  Analytical Engines  " }).name).toBe(
      "Analytical Engines",
    );
  });

  test("rejects an empty or whitespace-only name", () => {
    expect(updateOrganizationRequestSchema.safeParse({ name: "" }).success).toBe(false);
    expect(updateOrganizationRequestSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  test("bounds the name length", () => {
    expect(updateOrganizationRequestSchema.safeParse({ name: "a".repeat(81) }).success).toBe(false);
  });
});

describe("deleteOrganizationRequestSchema", () => {
  test("requires a non-empty confirmation name", () => {
    expect(deleteOrganizationRequestSchema.safeParse({ confirmationName: "" }).success).toBe(false);
    expect(
      deleteOrganizationRequestSchema.parse({ confirmationName: "Analytical Engines" })
        .confirmationName,
    ).toBe("Analytical Engines");
  });
});

describe("organizationContextSchema", () => {
  test("rejects a negative member count", () => {
    const base = {
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "org-1",
      logo: null,
      name: "Analytical Engines",
      role: "owner",
      slug: "analytical-engines",
    };

    expect(organizationContextSchema.safeParse({ ...base, memberCount: 1 }).success).toBe(true);
    expect(organizationContextSchema.safeParse({ ...base, memberCount: -1 }).success).toBe(false);
  });
});
