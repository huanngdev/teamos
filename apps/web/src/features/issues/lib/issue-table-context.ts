import { createContext, useContext } from "react";
import type {
  IssueListFacets,
  IssueSummary,
  ProjectMember,
  ProjectStatusSummary,
} from "@teamos/shared";

import type { IssueTableRow } from "./issue-table-query";

interface IssueTableContextValue {
  facets: IssueListFacets | null;
  isSelected: (issueId: string) => boolean;
  members: readonly ProjectMember[];
  openIssue: (issue: IssueSummary) => void;
  rows: readonly IssueTableRow[];
  statuses: readonly ProjectStatusSummary[];
  togglePage: (issueIds: readonly string[], selected: boolean) => void;
  toggleSelected: (issueId: string, selected: boolean) => void;
}

const IssueTableContext = createContext<IssueTableContextValue>({
  facets: null,
  isSelected: () => false,
  members: [],
  openIssue: () => undefined,
  rows: [],
  statuses: [],
  togglePage: () => undefined,
  toggleSelected: () => undefined,
});

function useIssueTableContext(): IssueTableContextValue {
  return useContext(IssueTableContext);
}

export { IssueTableContext, useIssueTableContext, type IssueTableContextValue };
