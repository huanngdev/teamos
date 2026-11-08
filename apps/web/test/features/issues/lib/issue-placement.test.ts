import { describe, expect, test } from "vitest";

import { placementForDrop } from "./issue-placement";

const cards = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("placementForDrop", () => {
  test("uses the start only when nothing is unloaded above the drop", () => {
    expect(placementForDrop(cards, "c", 0, 0)).toEqual({ type: "start" });
    expect(placementForDrop(cards, "c", 0, 4)).toEqual({ type: "before", anchorIssueId: "a" });
  });

  test("drops after the last loaded card instead of the end of the column", () => {
    expect(placementForDrop(cards, "a", 2, 0)).toEqual({ type: "after", anchorIssueId: "c" });
  });

  test("anchors between loaded neighbors", () => {
    expect(placementForDrop(cards, "a", 1, 0)).toEqual({ type: "after", anchorIssueId: "b" });
  });

  test("uses the end when the destination has no loaded card", () => {
    expect(placementForDrop([{ id: "a" }], "a", 0, 0)).toEqual({ type: "end" });
  });
});
