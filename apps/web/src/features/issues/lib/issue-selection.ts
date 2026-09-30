import type { IssueSummary } from "@teamos/shared";

import type { IssueTableRow } from "./issue-table-query";

function selectedIssues(
  rows: readonly IssueTableRow[],
  selection: Readonly<Record<string, boolean>>,
): IssueSummary[] {
  return rows.flatMap((row) => (selection[row.id] === true ? [row.issue] : []));
}

function logSelectedIssues(issues: readonly IssueSummary[]): void {
  // Selection is logged until a bulk action besides delete needs the ids.
  // eslint-disable-next-line no-console
  console.log(issues);
}

export { logSelectedIssues, selectedIssues };
