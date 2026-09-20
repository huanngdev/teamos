import { describe, expect, test } from "bun:test";

import { capitalize } from "./text.js";

describe("capitalize", () => {
  test("uppercases the first character", () => {
    expect(capitalize("admin")).toBe("Admin");
  });

  test("leaves the remaining characters untouched", () => {
    expect(capitalize("owner")).toBe("Owner");
  });

  test("returns an empty string unchanged", () => {
    expect(capitalize("")).toBe("");
  });
});
