import { describe, expect, test } from "bun:test";

import { slugify } from "./slug.js";

describe("slugify", () => {
  test("normalizes names into a URL-safe slug", () => {
    expect(slugify("Analytical Engines")).toBe("analytical-engines");
  });

  test("removes diacritics and collapses separators", () => {
    expect(slugify("  Đội Ngũ  Việt Nam  ")).toBe("doi-ngu-viet-nam");
  });

  test("strips punctuation and repeated hyphens", () => {
    expect(slugify("Acme, Inc. -- Team #1")).toBe("acme-inc-team-1");
  });

  test("returns an empty value when no slug characters remain", () => {
    expect(slugify("日本語")).toBe("");
  });

  test("limits the slug length", () => {
    expect(slugify("a".repeat(80)).length).toBeLessThanOrEqual(48);
  });
});
