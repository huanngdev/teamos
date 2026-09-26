import { describe, expect, test } from "bun:test";

import {
  createIssueRequestSchema,
  createProjectStatusRequestSchema,
  updateIssueRequestSchema,
  updateProjectStatusRequestSchema,
} from "./issue.js";

describe("createIssueRequestSchema", () => {
  test("accepts a title without a status", () => {
    const parsed = createIssueRequestSchema.parse({ title: "  Fix the gate  " });

    expect(parsed.title).toBe("Fix the gate");
    expect(parsed.statusId).toBeUndefined();
  });

  test("rejects a blank title and a title past 140 characters", () => {
    expect(createIssueRequestSchema.safeParse({ title: " " }).success).toBe(false);
    expect(createIssueRequestSchema.safeParse({ title: "a".repeat(141) }).success).toBe(false);
  });
});

describe("updateIssueRequestSchema", () => {
  test("allows clearing the description without changing order", () => {
    const parsed = updateIssueRequestSchema.parse({ description: null });

    expect(parsed.description).toBeNull();
    expect(parsed.index).toBeUndefined();
  });

  test("accepts a drop index and strips a raw position", () => {
    const parsed = updateIssueRequestSchema.parse({ index: 2, position: 4000 });

    expect(parsed).toEqual({ index: 2 });
  });

  test("rejects an index past the board cap", () => {
    expect(updateIssueRequestSchema.safeParse({ index: 201 }).success).toBe(false);
  });
});

describe("createProjectStatusRequestSchema", () => {
  test("rejects an unknown category and a name past 40 characters", () => {
    expect(
      createProjectStatusRequestSchema.safeParse({ category: "review", name: "Review" }).success,
    ).toBe(false);
    expect(
      createProjectStatusRequestSchema.safeParse({ category: "started", name: "a".repeat(41) })
        .success,
    ).toBe(false);
  });
});

describe("updateProjectStatusRequestSchema", () => {
  test("does not accept a category change", () => {
    const parsed = updateProjectStatusRequestSchema.parse({
      category: "completed",
      name: "Done",
    });

    expect(parsed).toEqual({ name: "Done" });
  });
});
