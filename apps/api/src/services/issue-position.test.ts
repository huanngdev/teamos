import { describe, expect, test } from "bun:test";
import { ISSUE_POSITION_GAP } from "@teamos/shared";

import { placeAtIndex, placeBetween, reorderByIndex, spreadWindow } from "./issue-position.js";

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

describe("placeBetween", () => {
  test("uses the midpoint when the neighbors have room", () => {
    expect(placeBetween(0, 1000)).toEqual({ kind: "position", position: 500 });
  });

  test("asks for a rebalance when the gap is exhausted or the integer would overflow", () => {
    expect(placeBetween(5, 6)).toEqual({ kind: "rebalance" });
    expect(placeBetween(2_147_483_647, null)).toEqual({ kind: "rebalance" });
  });
});

describe("spreadWindow", () => {
  test("rewrites only the window and leaves a position for the moving issue", () => {
    const spread = spreadWindow({
      high: 5_000,
      insertAt: 1,
      low: 0,
      movingId: "moving",
      orderedIds: ["a", "b"],
    });

    expect(spread.kind).toBe("spread");

    if (spread.kind !== "spread") {
      return;
    }

    expect(spread.positions.map((item) => item.id)).toEqual(["a", "b"]);
    expect(spread.movingPosition).toBeGreaterThan(spread.positions[0]?.position ?? 0);
    expect(spread.movingPosition).toBeLessThan(spread.positions[1]?.position ?? 0);
  });

  test("refuses a packed window instead of moving rows outside it", () => {
    expect(
      spreadWindow({
        high: 3,
        insertAt: 1,
        low: 0,
        movingId: "moving",
        orderedIds: ["a", "b"],
      }).kind,
    ).toBe("full");
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
