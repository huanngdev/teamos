import type { IssueCardSummary, ProjectStatusSummary } from "@teamos/shared";

interface BoardColumn {
  error: string | null;
  hasMoreAfter: boolean;
  hasMoreBefore: boolean;
  issues: IssueCardSummary[];
  loadingMore: boolean;
  prependToken: number;
  prepended: number;
  skippedBefore: number;
  status: ProjectStatusSummary;
  total: number;
  trimToken: number;
  trimmed: number;
}

interface IssueDropTarget {
  index: number;
  statusId: string;
}

function comparePosition(
  left: { id: string; position: number },
  right: { id: string; position: number },
) {
  return left.position - right.position || left.id.localeCompare(right.id);
}

function emptyColumn(status: ProjectStatusSummary, issues: IssueCardSummary[]): BoardColumn {
  return {
    error: null,
    hasMoreAfter: false,
    hasMoreBefore: false,
    issues,
    loadingMore: false,
    prependToken: 0,
    prepended: 0,
    skippedBefore: 0,
    status,
    total: issues.length,
    trimToken: 0,
    trimmed: 0,
  };
}

function groupBoardColumns(
  statuses: readonly ProjectStatusSummary[],
  issues: readonly IssueCardSummary[],
): BoardColumn[] {
  return [...statuses]
    .sort(comparePosition)
    .map((status) =>
      emptyColumn(
        status,
        issues.filter((issue) => issue.statusId === status.id).sort(comparePosition),
      ),
    );
}

function applyIssueMove(
  issues: readonly IssueCardSummary[],
  issueId: string,
  statusId: string,
  index: number,
): IssueCardSummary[] {
  const moving = issues.find((issue) => issue.id === issueId);

  if (moving === undefined) {
    return [...issues];
  }

  const next = issues.filter((issue) => issue.id !== issueId);
  const target = next.filter((issue) => issue.statusId === statusId);
  const clamped = Math.min(Math.max(index, 0), target.length);
  const placed = { ...moving, position: clamped, statusId };
  const before = target.slice(0, clamped);
  const after = target.slice(clamped);
  const rebuilt = [...before, placed, ...after].map((issue, itemIndex) => ({
    ...issue,
    position: itemIndex,
  }));
  const others = next.filter((issue) => issue.statusId !== statusId);

  return [...others, ...rebuilt];
}

function resolveBoardSnapshot(
  cached:
    { issues: readonly IssueCardSummary[]; statuses: readonly ProjectStatusSummary[] } | undefined,
  statuses: readonly ProjectStatusSummary[] | undefined,
  issues: readonly IssueCardSummary[] | undefined,
): { issues: readonly IssueCardSummary[]; statuses: readonly ProjectStatusSummary[] } {
  if (cached !== undefined && cached.statuses.length > 0) {
    return cached;
  }

  return {
    issues: issues ?? [],
    statuses: statuses ?? [],
  };
}

function applyColumnMove(
  statuses: readonly ProjectStatusSummary[],
  statusId: string,
  index: number,
): ProjectStatusSummary[] {
  const ordered = [...statuses].sort(comparePosition);
  const moving = ordered.find((status) => status.id === statusId);

  if (moving === undefined) {
    return ordered;
  }

  const rest = ordered.filter((status) => status.id !== statusId);
  const clamped = Math.min(Math.max(index, 0), rest.length);
  const next = [...rest.slice(0, clamped), moving, ...rest.slice(clamped)];

  return next.map((status, itemIndex) => ({ ...status, position: itemIndex * 1000 }));
}

export {
  applyColumnMove,
  applyIssueMove,
  groupBoardColumns,
  resolveBoardSnapshot,
  type BoardColumn,
  type IssueDropTarget,
};
