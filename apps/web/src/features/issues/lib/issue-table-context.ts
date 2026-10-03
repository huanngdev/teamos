import { createContext, useContext } from "react";
import type { IssueListFacets, ProjectMember, ProjectStatusSummary } from "@teamos/shared";

import type { EligibleAssigneePicker } from "@/features/projects";
import type { IssueTableRow } from "./issue-table-query";

interface IssueTableContextValue {
  assignees: EligibleAssigneePicker;
  canDelete: boolean;
  canUpdate: boolean;
  facets: IssueListFacets | null;
  highlightedIssueId: string | null;
  isSelected: (issueId: string) => boolean;
  issueHref: (number: string) => string;
  members: readonly ProjectMember[];
  onDeleteIssue: (issueId: string) => void;
  onQuickEdit: (issueId: string) => void;
  rows: readonly IssueTableRow[];
  statuses: readonly ProjectStatusSummary[];
  togglePage: (issueIds: readonly string[], selected: boolean) => void;
  toggleSelected: (issueId: string, selected: boolean) => void;
}

const emptyAssigneePicker: EligibleAssigneePicker = {
  assignees: [],
  error: null,
  hasMore: false,
  loading: false,
  loadingMore: false,
  onLoadMore: () => undefined,
  onRetry: () => undefined,
  onSearch: () => undefined,
  search: "",
};

const IssueTableContext = createContext<IssueTableContextValue>({
  assignees: emptyAssigneePicker,
  canDelete: false,
  canUpdate: false,
  facets: null,
  highlightedIssueId: null,
  isSelected: () => false,
  issueHref: () => "",
  members: [],
  onDeleteIssue: () => undefined,
  onQuickEdit: () => undefined,
  rows: [],
  statuses: [],
  togglePage: () => undefined,
  toggleSelected: () => undefined,
});

function useIssueTableContext(): IssueTableContextValue {
  return useContext(IssueTableContext);
}

export { IssueTableContext, useIssueTableContext, type IssueTableContextValue };
