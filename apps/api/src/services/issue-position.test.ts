import { describe, expect, test } from "bun:test";
import { ISSUE_POSITION_GAP } from "@teamos/shared";

import { placeAtIndex, reorderByIndex } from "./issue-position.js";

describe("placeAtIndex", () => {
  test("starts an empty column at zero", () => {
    expect(placeAtIndex([], 0, "new")).toEqual({ kind: "position", position: 0 });
  });

  test("inserts at the top by stepping back one gap", () => {
    expect(placeAtIndex([{ id: "a", position: 0 }], 0, "new")).toEqual({
      kind: "position",
      position: -ISSUE_POSITION_GAP,
    });
  });

  test("appends past the end with one gap", () => {
    expect(placeAtIndex([{ id: "a", position: 0 }], 4, "new")).toEqual({
      kind: "position",
      position: ISSUE_POSITION_GAP,
    });
  });

  test("rewrites the column when the neighbor gap is exhausted", () => {
    expect(
      placeAtIndex(
        [
          { id: "a", position: 0 },
          { id: "b", position: 1 },
        ],
        1,
        "new",
      ),
    ).toEqual({
      kind: "rebalance",
      positions: [
        { id: "a", position: 0 },
        { id: "new", position: ISSUE_POSITION_GAP },
        { id: "b", position: ISSUE_POSITION_GAP * 2 },
      ],
    });
  });
});

describe("reorderByIndex", () => {
  test("moves an item to the front and rewrites positions", () => {
    expect(reorderByIndex(["a", "b", "c"], "c", 0)).toEqual([
      { id: "c", position: 0 },
      { id: "a", position: ISSUE_POSITION_GAP },
      { id: "b", position: ISSUE_POSITION_GAP * 2 },
    ]);
  });
});
