import type { IssueSummary, IssueViewDefinition, ProjectStatusSummary } from "@teamos/shared";

function issueViewStatusMoveRequest(
  currentStatusId: string,
  destinationStatusId: string,
): { statusId: string } | null {
  if (currentStatusId === destinationStatusId) {
    return null;
  }

  return { statusId: destinationStatusId };
}

function placeIssueAtColumnTop(
  issues: readonly IssueSummary[],
  issueId: string,
  statusId: string,
): IssueSummary[] {
  const moving = issues.find((issue) => issue.id === issueId);

  if (moving === undefined || moving.statusId === statusId) {
    return [...issues];
  }

  const destination = issues.filter((issue) => issue.statusId === statusId && issue.id !== issueId);
  const nextPosition =
    destination.length === 0 ? 0 : Math.min(...destination.map((issue) => issue.position)) - 1000;

  return issues.map((issue) =>
    issue.id === issueId ? { ...issue, position: nextPosition, statusId } : issue,
  );
}

function issueMatchesViewColumns(
  issue: Pick<IssueSummary, "statusId">,
  definition: IssueViewDefinition,
  statuses: readonly ProjectStatusSummary[],
): boolean {
  const statusIds = definition.filters.statusIds;

  if (statusIds !== undefined && statusIds.length > 0 && !statusIds.includes(issue.statusId)) {
    return false;
  }

  const categories = definition.filters.categories;

  if (categories === undefined || categories.length === 0) {
    return true;
  }

  const status = statuses.find((item) => item.id === issue.statusId);

  return status !== undefined && categories.includes(status.category);
}

export { issueMatchesViewColumns, issueViewStatusMoveRequest, placeIssueAtColumnTop };
