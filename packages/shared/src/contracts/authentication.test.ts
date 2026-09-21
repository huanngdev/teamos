import { describe, expect, test } from "bun:test";

import { updateCurrentUserRequestSchema } from "./authentication.js";

describe("updateCurrentUserRequestSchema", () => {
  test("trims the submitted name", () => {
    expect(updateCurrentUserRequestSchema.parse({ name: "  Ada Lovelace  " }).name).toBe(
      "Ada Lovelace",
    );
  });

  test("rejects an empty or whitespace-only name", () => {
    expect(updateCurrentUserRequestSchema.safeParse({ name: "" }).success).toBe(false);
    expect(updateCurrentUserRequestSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  test("bounds the name length", () => {
    expect(updateCurrentUserRequestSchema.safeParse({ name: "a".repeat(81) }).success).toBe(false);
    expect(updateCurrentUserRequestSchema.safeParse({ name: "a".repeat(80) }).success).toBe(true);
  });

  test("rejects a non-string name", () => {
    expect(updateCurrentUserRequestSchema.safeParse({ name: 42 }).success).toBe(false);
  });

  test("rejects fields that have their own flows", () => {
    expect(
      updateCurrentUserRequestSchema.safeParse({ email: "ada@example.com", name: "Ada" }).success,
    ).toBe(false);
    expect(
      updateCurrentUserRequestSchema.safeParse({ image: "https://example.com/a.png", name: "Ada" })
        .success,
    ).toBe(false);
    expect(
      updateCurrentUserRequestSchema.safeParse({ emailVerified: true, name: "Ada" }).success,
    ).toBe(false);
  });
});
