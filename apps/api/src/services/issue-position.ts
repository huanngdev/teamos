import { ISSUE_POSITION_GAP, ISSUE_POSITION_MAX, ISSUE_POSITION_MIN } from "@teamos/shared";

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

function placeBetween(
  previous: number | null,
  next: number | null,
): { kind: "position"; position: number } | { kind: "rebalance" } {
  if (previous === null && next === null) {
    return { kind: "position", position: 0 };
  }

  if (previous === null && next !== null) {
    if (next < ISSUE_POSITION_MIN + ISSUE_POSITION_GAP) {
      return { kind: "rebalance" };
    }

    return { kind: "position", position: next - ISSUE_POSITION_GAP };
  }

  if (previous !== null && next === null) {
    if (previous > ISSUE_POSITION_MAX - ISSUE_POSITION_GAP) {
      return { kind: "rebalance" };
    }

    return { kind: "position", position: previous + ISSUE_POSITION_GAP };
  }

  if (next === null || previous === null || next - previous < 2) {
    return { kind: "rebalance" };
  }

  return {
    kind: "position",
    position: previous + Math.floor((next - previous) / 2),
  };
}

/*
 * Rewrites only the rows inside an open interval. `orderedIds` excludes the
 * moving issue. `insertAt` is where that issue sits in the window.
 */
function spreadWindow(input: {
  high: number | null;
  insertAt: number;
  low: number | null;
  movingId: string;
  orderedIds: readonly string[];
}): { kind: "full" } | { kind: "spread"; movingPosition: number; positions: PlacedPosition[] } {
  const insertAt = Math.min(Math.max(input.insertAt, 0), input.orderedIds.length);
  const ordered = [
    ...input.orderedIds.slice(0, insertAt),
    input.movingId,
    ...input.orderedIds.slice(insertAt),
  ];
  const count = ordered.length;
  const step = chooseStep(input.low, input.high, count);

  if (step === null) {
    return { kind: "full" };
  }

  const positions: PlacedPosition[] = [];
  let movingPosition = step.start;

  for (let index = 0; index < ordered.length; index += 1) {
    const id = ordered[index];
    const position = step.start + index * step.gap;

    if (id === undefined || position > ISSUE_POSITION_MAX || position < ISSUE_POSITION_MIN) {
      return { kind: "full" };
    }

    if (id === input.movingId) {
      movingPosition = position;
      continue;
    }

    positions.push({ id, position });
  }

  return { kind: "spread", movingPosition, positions };
}

function chooseStep(
  low: number | null,
  high: number | null,
  count: number,
): { gap: number; start: number } | null {
  if (count === 0) {
    return { gap: ISSUE_POSITION_GAP, start: 0 };
  }

  if (low !== null && high !== null) {
    const room = high - low - 1;

    if (room < count) {
      return null;
    }

    const gap = Math.max(1, Math.floor((high - low) / (count + 1)));
    const start = low + gap;

    if (start + (count - 1) * gap >= high) {
      return null;
    }

    return { gap, start };
  }

  if (high !== null) {
    const gap = ISSUE_POSITION_GAP;
    const start = high - count * gap;

    if (start < ISSUE_POSITION_MIN || start + (count - 1) * gap >= high) {
      const packedStart = high - count;

      if (packedStart < ISSUE_POSITION_MIN || (low !== null && packedStart <= low)) {
        return null;
      }

      return { gap: 1, start: packedStart };
    }

    if (low !== null && start <= low) {
      return null;
    }

    return { gap, start };
  }

  const start = low === null ? 0 : low + ISSUE_POSITION_GAP;
  const end = start + (count - 1) * ISSUE_POSITION_GAP;

  if (start < ISSUE_POSITION_MIN || end > ISSUE_POSITION_MAX) {
    return null;
  }

  if (high !== null && end >= high) {
    return null;
  }

  return { gap: ISSUE_POSITION_GAP, start };
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

export {
  placeAtIndex,
  placeBetween,
  reorderByIndex,
  spreadWindow,
  type IssuePlacement,
  type PositionedItem,
};
