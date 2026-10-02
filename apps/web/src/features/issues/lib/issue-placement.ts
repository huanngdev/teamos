import type { IssueCardSummary, IssuePlacement } from "@teamos/shared";

const COLUMN_WINDOW = 120;

function placementForDrop(
  issues: readonly { id: string }[],
  movingId: string,
  index: number,
  skippedBefore: number,
): IssuePlacement {
  const others = issues.filter((issue) => issue.id !== movingId);

  if (others.length === 0) {
    return { type: "end" };
  }

  const clamped = Math.min(Math.max(index, 0), others.length);

  if (clamped === 0) {
    if (skippedBefore > 0) {
      const first = others[0];

      return first === undefined ? { type: "start" } : { type: "before", anchorIssueId: first.id };
    }

    return { type: "start" };
  }

  const anchor = others[clamped - 1];

  return anchor === undefined ? { type: "end" } : { type: "after", anchorIssueId: anchor.id };
}

function optimisticPosition(previous: number | undefined, next: number | undefined): number {
  if (previous === undefined && next === undefined) {
    return 0;
  }

  if (previous === undefined) {
    return (next ?? 0) - 1;
  }

  if (next === undefined) {
    return previous + 1;
  }

  if (next - previous > 1) {
    return Math.floor((previous + next) / 2);
  }

  return previous + 1;
}

function insertIssue(
  issues: readonly IssueCardSummary[],
  moving: IssueCardSummary,
  index: number,
): IssueCardSummary[] {
  const others = issues.filter((issue) => issue.id !== moving.id);
  const clamped = Math.min(Math.max(index, 0), others.length);
  const placed = {
    ...moving,
    position: optimisticPosition(others[clamped - 1]?.position, others[clamped]?.position),
  };

  return [...others.slice(0, clamped), placed, ...others.slice(clamped)];
}

function limitColumnWindow(
  issues: readonly IssueCardSummary[],
  skippedBefore: number,
): {
  issues: IssueCardSummary[];
  skippedBefore: number;
  trimmed: number;
} {
  if (issues.length <= COLUMN_WINDOW) {
    return { issues: [...issues], skippedBefore, trimmed: 0 };
  }

  const trimmed = issues.length - COLUMN_WINDOW;

  return {
    issues: issues.slice(trimmed),
    skippedBefore: skippedBefore + trimmed,
    trimmed,
  };
}

export { COLUMN_WINDOW, insertIssue, limitColumnWindow, optimisticPosition, placementForDrop };
