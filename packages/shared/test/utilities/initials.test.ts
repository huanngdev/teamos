import { expect, test } from "vitest";

import { getInitials } from "../../src/utilities/initials.js";

test("uses the first letter of the first two words", () => {
  expect(getInitials("Ada Lovelace")).toBe("AL");
  expect(getInitials("Grace Brewster Murray Hopper")).toBe("GB");
});

test("uses a single letter for a single word", () => {
  expect(getInitials("Acme")).toBe("A");
});

test("trims surrounding whitespace and ignores empty input", () => {
  expect(getInitials("  ada   lovelace  ")).toBe("AL");
  expect(getInitials("")).toBe("");
  expect(getInitials("   ")).toBe("");
});
