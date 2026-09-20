import { describe, expect, test } from "bun:test";

import { SEARCH_TERM_MAX_LENGTH } from "../utilities/search.js";
import {
  createProjectRequestSchema,
  projectListQuerySchema,
  projectMemberSchema,
  projectSlugSchema,
  projectSummarySchema,
  setProjectMemberRequestSchema,
  updateProjectRequestSchema,
} from "./project.js";

describe("projectSlugSchema", () => {
  test("accepts a lowercase hyphenated slug", () => {
    expect(projectSlugSchema.parse("  apollo-mission  ")).toBe("apollo-mission");
  });

  test("rejects uppercase, spaces, and path characters", () => {
    expect(projectSlugSchema.safeParse("Apollo").success).toBe(false);
    expect(projectSlugSchema.safeParse("apollo mission").success).toBe(false);
    expect(projectSlugSchema.safeParse("../apollo").success).toBe(false);
  });
});

describe("createProjectRequestSchema", () => {
  test("defaults visibility to workspace", () => {
    const parsed = createProjectRequestSchema.parse({ name: "Apollo", slug: "apollo" });

    expect(parsed.visibility).toBe("workspace");
  });

  test("rejects an unknown visibility and an empty name", () => {
    expect(
      createProjectRequestSchema.safeParse({ name: "Apollo", slug: "apollo", visibility: "public" })
        .success,
    ).toBe(false);
    expect(createProjectRequestSchema.safeParse({ name: " ", slug: "apollo" }).success).toBe(false);
  });
});

describe("updateProjectRequestSchema", () => {
  test("allows clearing the description", () => {
    expect(updateProjectRequestSchema.parse({ description: null }).description).toBeNull();
  });

  test("strips a slug change because the public identifier is stable", () => {
    const parsed = updateProjectRequestSchema.parse({ name: "Apollo II", slug: "renamed" });

    expect(parsed).toEqual({ name: "Apollo II" });
  });
});

describe("setProjectMemberRequestSchema", () => {
  test("defaults the project role to member", () => {
    const parsed = setProjectMemberRequestSchema.parse({ memberId: "member-1" });

    expect(parsed.role).toBe("member");
  });

  test("only accepts a project role", () => {
    expect(
      setProjectMemberRequestSchema.safeParse({ memberId: "member-1", role: "owner" }).success,
    ).toBe(false);
  });
});

describe("projectListQuerySchema", () => {
  test("makes the search term optional and trims it", () => {
    expect(projectListQuerySchema.parse({}).search).toBeUndefined();
    expect(projectListQuerySchema.parse({ search: "  apollo " }).search).toBe("apollo");
  });

  test("bounds the search term length", () => {
    expect(
      projectListQuerySchema.safeParse({ search: "a".repeat(SEARCH_TERM_MAX_LENGTH + 1) }).success,
    ).toBe(false);
  });
});

describe("projectSummarySchema", () => {
  test("requires a non-negative member count", () => {
    const base = {
      createdAt: "2026-01-01T00:00:00.000Z",
      description: null,
      id: "project-1",
      name: "Apollo",
      role: "lead",
      slug: "apollo",
      updatedAt: "2026-01-01T00:00:00.000Z",
      visibility: "workspace",
    };

    expect(projectSummarySchema.safeParse({ ...base, memberCount: 0 }).success).toBe(true);
    expect(projectSummarySchema.safeParse({ ...base, memberCount: -1 }).success).toBe(false);
  });
});

describe("projectMemberSchema", () => {
  test("rejects an organization role in the project role field", () => {
    const parsed = projectMemberSchema.safeParse({
      email: "ada@example.com",
      image: null,
      memberId: "member-1",
      name: "Ada",
      role: "admin",
      userId: "user-1",
    });

    expect(parsed.success).toBe(false);
  });
});
