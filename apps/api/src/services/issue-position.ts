import { ISSUE_POSITION_GAP } from "@teamos/shared";

interface PositionedItem {
  id: string;
  position: number;
}

interface PlacedPosition {
  id: string;
  position: number;
}

type IssuePlacement =
  { kind: "position"; position: number } | { kind: "rebalance"; positions: PlacedPosition[] };

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), length);
}

/*
 * Neighbors are the other items in the column, already ordered by position
 * then id, and excluding the item being placed. A gap smaller than 2 cannot
 * hold a midpoint, so the column is rewritten.
 */
function placeAtIndex(
  items: readonly PositionedItem[],
  index: number,
  movingId: string,
): IssuePlacement {
  const clamped = clampIndex(index, items.length);
  const previous = items[clamped - 1];
  const next = items[clamped];

  if (previous === undefined && next === undefined) {
    return { kind: "position", position: 0 };
  }

  if (previous === undefined && next !== undefined) {
    return { kind: "position", position: next.position - ISSUE_POSITION_GAP };
  }

  if (previous !== undefined && next === undefined) {
    return { kind: "position", position: previous.position + ISSUE_POSITION_GAP };
  }

  if (previous !== undefined && next !== undefined && next.position - previous.position >= 2) {
    return {
      kind: "position",
      position: previous.position + Math.floor((next.position - previous.position) / 2),
    };
  }

  const ordered = [
    ...items.slice(0, clamped),
    { id: movingId, position: 0 },
    ...items.slice(clamped),
  ];

  return {
    kind: "rebalance",
    positions: ordered.map((item, itemIndex) => ({
      id: item.id,
      position: itemIndex * ISSUE_POSITION_GAP,
    })),
  };
}

function reorderByIndex(ids: readonly string[], movingId: string, index: number): PlacedPosition[] {
  const rest = ids.filter((id) => id !== movingId);
  const clamped = clampIndex(index, rest.length);
  const ordered = [...rest.slice(0, clamped), movingId, ...rest.slice(clamped)];

  return ordered.map((id, itemIndex) => ({
    id,
    position: itemIndex * ISSUE_POSITION_GAP,
  }));
}

export { placeAtIndex, reorderByIndex, type IssuePlacement, type PositionedItem };
