import type {
  IssuePlacement,
  IssueSummary,
  IssueViewDefinition,
  ProjectStatusSummary,
} from "@teamos/shared";

import { placementForDrop } from "@/features/issues/lib/issue-placement";

function issueViewMoveRequest(input: {
  currentStatusId: string;
  destinationIssues: readonly { id: string }[];
  destinationStatusId: string;
  index: number;
  movingId: string;
  skippedBefore: number;
  sourceIndex: number;
}): { placement: IssuePlacement; statusId: string } | null {
  if (input.currentStatusId === input.destinationStatusId && input.index === input.sourceIndex) {
    return null;
  }

  // The index is the card's place among the loaded, filtered cards. Anchors
  // keep that place without sending the index as a position in the full column.
  return {
    placement: placementForDrop(
      input.destinationIssues,
      input.movingId,
      input.index,
      input.skippedBefore,
    ),
    statusId: input.destinationStatusId,
  };
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

export { issueMatchesViewColumns, issueViewMoveRequest };
