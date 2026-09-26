import type { IssueSummary, ProjectStatusSummary } from "@teamos/shared";

interface BoardColumn {
  issues: IssueSummary[];
  status: ProjectStatusSummary;
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

function groupBoardColumns(
  statuses: readonly ProjectStatusSummary[],
  issues: readonly IssueSummary[],
): BoardColumn[] {
  return [...statuses].sort(comparePosition).map((status) => ({
    issues: issues.filter((issue) => issue.statusId === status.id).sort(comparePosition),
    status,
  }));
}

function applyIssueMove(
  issues: readonly IssueSummary[],
  issueId: string,
  statusId: string,
  index: number,
): IssueSummary[] {
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

export { applyIssueMove, groupBoardColumns, type BoardColumn, type IssueDropTarget };
