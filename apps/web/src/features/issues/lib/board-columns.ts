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

function findIssue(columns: readonly BoardColumn[], issueId: string) {
  for (const column of columns) {
    const index = column.issues.findIndex((issue) => issue.id === issueId);

    if (index >= 0) {
      return { column, index, issue: column.issues[index] };
    }
  }

  return undefined;
}

function issueDropSlot(
  columns: readonly BoardColumn[],
  issueId: string,
  overId: string,
  placeAfter = false,
): IssueDropTarget | null {
  if (overId === issueId) {
    return null;
  }

  const source = findIssue(columns, issueId);

  if (source === undefined) {
    return null;
  }

  const overColumn = columns.find((column) => column.status.id === overId);
  const targetColumn = overColumn ?? findIssue(columns, overId)?.column;

  if (targetColumn === undefined) {
    return null;
  }

  const others = targetColumn.issues.filter((issue) => issue.id !== issueId);
  const overIssueIndex = others.findIndex((issue) => issue.id === overId);
  const index =
    overColumn !== undefined || overIssueIndex < 0
      ? others.length
      : Math.min(others.length, overIssueIndex + (placeAfter ? 1 : 0));

  return { index, statusId: targetColumn.status.id };
}

function issueDropTarget(
  columns: readonly BoardColumn[],
  issueId: string,
  overId: string,
): IssueDropTarget | null {
  if (overId === issueId) {
    return null;
  }

  const target = issueDropSlot(columns, issueId, overId);
  const source = findIssue(columns, issueId);

  if (target === null || source === undefined) {
    return null;
  }

  if (target.statusId === source.column.status.id && target.index === source.index) {
    return null;
  }

  return target;
}

function columnDropSlot(
  columns: readonly BoardColumn[],
  statusId: string,
  overId: string,
  placeAfter = false,
): number | null {
  const sourceIndex = columns.findIndex((column) => column.status.id === statusId);

  if (sourceIndex < 0 || overId === statusId) {
    return null;
  }

  const overColumn =
    columns.find((column) => column.status.id === overId) ?? findIssue(columns, overId)?.column;

  if (overColumn === undefined || overColumn.status.id === statusId) {
    return null;
  }

  const overIndex = columns.findIndex((column) => column.status.id === overColumn.status.id);
  const insertAt = placeAfter ? overIndex + 1 : overIndex;
  const restIndex = insertAt > sourceIndex ? insertAt - 1 : insertAt;

  return restIndex === sourceIndex ? null : restIndex;
}

function columnDropIndex(
  columns: readonly BoardColumn[],
  statusId: string,
  overId: string,
): number | null {
  const sourceIndex = columns.findIndex((column) => column.status.id === statusId);

  if (sourceIndex < 0 || overId === statusId) {
    return null;
  }

  const overColumn =
    columns.find((column) => column.status.id === overId) ?? findIssue(columns, overId)?.column;

  if (overColumn === undefined || overColumn.status.id === statusId) {
    return null;
  }

  const overIndex = columns.findIndex((column) => column.status.id === overColumn.status.id);

  return overIndex === sourceIndex ? null : overIndex;
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

export {
  applyIssueMove,
  columnDropIndex,
  columnDropSlot,
  groupBoardColumns,
  issueDropSlot,
  issueDropTarget,
  type BoardColumn,
  type IssueDropTarget,
};
