import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { functionalUpdate, useTable } from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  canPerformProjectAction,
  type IssueSummary,
  type OrganizationRole,
  type ProjectMember,
  type ProjectStatusSummary,
} from "@teamos/shared";

import { listProjectMembers, useEligibleAssignees, useProjectList } from "@/features/projects";
import type { EligibleAssigneePicker } from "@/features/projects";
import { projectKeys } from "@/features/projects/query-keys";
import { memberCacheKey, useShellStore } from "@/shared";
import { listIssues, listProjectStatuses } from "../api/issue-api";
import { issueTableColumns } from "../components/issue-table-columns";
import type { IssueTable } from "../lib/issue-table-features";
import { issueTableFeatures } from "../lib/issue-table-features";
import { logSelectedIssues } from "../lib/issue-selection";
import { withSelectColumnPinned } from "../lib/issue-table-pin";
import {
  buildIssueTableRows,
  defaultIssueTableSort,
  isIssueTableColumnId,
  isIssueTablePageSize,
  issueGlobalFilter,
  issueListRequestParams,
  issueTableHasFilters,
  parseIssueTableSearch,
  serializeIssueTableSearch,
  type IssueTableQuery,
  type IssueTableRow,
} from "../lib/issue-table-query";
import { issueKeys } from "../query-keys";
import { boardKey, useBoardStore } from "../stores/board-store";
import { selectionKey, useIssueSelectionStore } from "../stores/issue-selection-store";
import { useDeleteSelectedIssues } from "./use-delete-selected-issues";
import { useIssueForm, type IssueFormState } from "./use-issue-form";

const emptySelection: Record<string, true> = {};
const emptyIssues: IssueSummary[] = [];
const emptyMembers: ProjectMember[] = [];
const emptyStatuses: ProjectStatusSummary[] = [];
const searchDelayMs = 300;

interface UseIssueTableOptions {
  enabled: boolean;
  organizationRole: OrganizationRole;
  organizationSlug: string;
  projectSlug: string;
}

type IssueTableState =
  | { status: "loading" }
  | { status: "not-found" }
  | { message: string; retry: () => void; status: "error" }
  | { status: "ready"; view: IssueTableView };

interface IssueTableView {
  canCreate: boolean;
  canDelete: boolean;
  deleteSelected: {
    cancel: () => void;
    confirm: () => void;
    count: number;
    error: string | null;
    isPending: boolean;
    open: boolean;
  };
  facets: IssueTableFacets;
  isSelected: (issueId: string) => boolean;
  togglePage: (issueIds: readonly string[], selected: boolean) => void;
  toggleSelected: (issueId: string, selected: boolean) => void;
  assignees: EligibleAssigneePicker;
  hasFilters: boolean;
  issueForm: IssueFormState;
  members: ProjectMember[];
  membersError: string | null;
  onClearFilters: () => void;
  onClearSearch: () => void;
  onCreate: () => void;
  onDeleteSelected: () => void;
  onSearchChange: (value: string) => void;
  openIssue: (issue: IssueSummary) => void;
  rows: IssueTableRow[];
  search: string;
  selectedCount: number;
  statuses: ProjectStatusSummary[];
  table: IssueTable;
  truncated: { shown: number; total: number } | null;
}

type IssueTableFacets = NonNullable<Awaited<ReturnType<typeof listIssues>>["facets"]> | null;

/*
 * Filter, search, sort, and page are all applied by the list endpoint. Column
 * order and visibility stay in the URL. The board uses its own query, so a
 * table page cannot replace the columns.
 */
function useIssueTable(options: UseIssueTableOptions): IssueTableState {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(
    () => parseIssueTableSearch(new URLSearchParams(location.search)),
    [location.search],
  );
  const [searchInput, setSearchInput] = useState(query.q);
  const writtenQuery = useRef(query.q);
  const projectList = useProjectList({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
  });
  const project = projectList.projects.find((item) => item.slug === options.projectSlug) ?? null;
  const projectId = project?.id ?? null;
  const cachedBoard = useBoardStore((state) =>
    projectId === null ? undefined : state.boards[boardKey(options.organizationSlug, projectId)],
  );
  const statuses = useQuery({
    enabled: options.enabled && projectId !== null,
    queryFn: async () => {
      const result = await listProjectStatuses(options.organizationSlug, projectId ?? "");

      if (projectId !== null) {
        useBoardStore.getState().setStatuses(boardKey(options.organizationSlug, projectId), result);
      }

      return result;
    },
    queryKey: issueKeys(options.organizationSlug, projectId ?? "").statuses(),
  });
  const listParams = useMemo(
    () => issueListRequestParams(query, Intl.DateTimeFormat().resolvedOptions().timeZone),
    [query],
  );
  const listed = useQuery({
    enabled: options.enabled && projectId !== null,
    placeholderData: keepPreviousData,
    queryFn: () => listIssues(options.organizationSlug, projectId ?? "", listParams),
    queryKey: issueKeys(options.organizationSlug, projectId ?? "").list(listParams),
  });
  const cachedMembers = useShellStore((state) =>
    projectId === null
      ? undefined
      : state.members[memberCacheKey(options.organizationSlug, projectId)],
  );
  const setMembers = useShellStore((state) => state.setMembers);
  const members = useQuery({
    enabled: options.enabled && projectId !== null && cachedMembers === undefined,
    queryFn: async () => {
      const result = await listProjectMembers(options.organizationSlug, projectId ?? "");

      if (projectId !== null) {
        setMembers(options.organizationSlug, projectId, result);
      }

      return result;
    },
    queryKey: projectKeys(options.organizationSlug).members(projectId ?? ""),
  });
  const issues = listed.data?.issues ?? emptyIssues;
  const statusList = cachedBoard?.statuses ?? statuses.data ?? emptyStatuses;
  const memberList = cachedMembers ?? members.data ?? emptyMembers;
  const assignees = useEligibleAssignees({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
    projectId,
  });
  const rows = useMemo(
    () => buildIssueTableRows(issues, statusList, memberList),
    [issues, memberList, statusList],
  );
  const [columnPinning, setColumnPinning] = useState(() =>
    withSelectColumnPinned({ end: [], start: [] }),
  );
  const selection = selectionKey(options.organizationSlug, projectId ?? "");
  const selectedIds = useIssueSelectionStore(
    (state) => state.selected[selection] ?? emptySelection,
  );
  const toggleSelection = useIssueSelectionStore((state) => state.toggle);
  const togglePageSelection = useIssueSelectionStore((state) => state.toggleMany);
  const clearSelection = useIssueSelectionStore((state) => state.clear);
  const canDeleteIssues =
    project !== null &&
    canPerformProjectAction("delete-issue", {
      organizationRole: options.organizationRole,
      projectRole: project.role,
      visibility: project.visibility,
    });
  const deleteSelected = useDeleteSelectedIssues({
    canDelete: canDeleteIssues,
    onDeleted: () => {
      clearSelection(selection);
    },
    organizationSlug: options.organizationSlug,
    projectId,
  });
  const issueForm = useIssueForm({
    canDeleteIssue: canDeleteIssues,
    canUpdateIssue:
      project !== null &&
      canPerformProjectAction("update-issue", {
        organizationRole: options.organizationRole,
        projectRole: project.role,
        visibility: project.visibility,
      }),
    organizationSlug: options.organizationSlug,
    projectId,
    statuses: statusList,
  });

  const commit = (next: IssueTableQuery) => {
    const sanitized = parseIssueTableSearch(serializeIssueTableSearch(next));
    writtenQuery.current = sanitized.q;
    const search = serializeIssueTableSearch(sanitized).toString();
    const current = serializeIssueTableSearch(
      parseIssueTableSearch(new URLSearchParams(location.search)),
    ).toString();

    if (search === current) {
      return;
    }

    void navigate({ pathname: location.pathname, search }, { replace: true });
  };

  const queryRef = useRef(query);
  const commitRef = useRef(commit);
  queryRef.current = query;
  commitRef.current = commit;

  useEffect(() => {
    if (query.q === writtenQuery.current) {
      return;
    }

    writtenQuery.current = query.q;
    setSearchInput(query.q);
  }, [query.q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      const current = queryRef.current;

      if (next === current.q) {
        return;
      }

      commitRef.current({ ...current, pageIndex: 0, q: next });
    }, searchDelayMs);

    return () => {
      window.clearTimeout(handle);
    };
  }, [searchInput]);

  const table = useTable({
    autoResetPageIndex: false,
    columns: issueTableColumns,
    data: rows,
    enableMultiSort: false,
    features: issueTableFeatures,
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    pageCount: listed.data?.pageCount ?? 0,
    rowCount: listed.data?.total ?? 0,
    getRowId: (row) => row.id,
    globalFilterFn: issueGlobalFilter,
    onColumnFiltersChange: (updater) => {
      const next = functionalUpdate(updater, query.columnFilters);

      commit({
        ...query,
        columnFilters: next.flatMap((filter) =>
          isIssueTableColumnId(filter.id) ? [{ id: filter.id, value: filter.value }] : [],
        ),
        pageIndex: 0,
      });
    },
    onColumnPinningChange: (updater) => {
      setColumnPinning((current) => withSelectColumnPinned(functionalUpdate(updater, current)));
    },
    onColumnOrderChange: (updater) => {
      const next = functionalUpdate(updater, query.columnOrder);

      commit({
        ...query,
        columnOrder: next.filter(isIssueTableColumnId),
      });
    },
    onColumnVisibilityChange: (updater) => {
      commit({
        ...query,
        columnVisibility: functionalUpdate(updater, query.columnVisibility),
      });
    },
    onGlobalFilterChange: (updater) => {
      const next = functionalUpdate(updater, query.q);
      const q = typeof next === "string" ? next.trim() : "";

      setSearchInput(q);
      commit({ ...query, pageIndex: 0, q });
    },
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, {
        pageIndex: query.pageIndex,
        pageSize: query.pageSize,
      });
      const pageSize = isIssueTablePageSize(next.pageSize) ? next.pageSize : query.pageSize;

      commit({
        ...query,
        pageIndex: pageSize === query.pageSize ? next.pageIndex : 0,
        pageSize,
      });
    },
    onSortingChange: (updater) => {
      const next = functionalUpdate(updater, query.sorting);
      const first = next[0];
      const sorting =
        first === undefined || !isIssueTableColumnId(first.id)
          ? { ...defaultIssueTableSort }
          : { desc: first.desc, id: first.id };
      const previous = query.sorting[0];
      const changed =
        previous === undefined || sorting.id !== previous.id || sorting.desc !== previous.desc;

      commit({
        ...query,
        pageIndex: changed ? 0 : query.pageIndex,
        sorting: [sorting],
      });
    },
    state: {
      columnFilters: query.columnFilters,
      columnOrder: query.columnOrder,
      columnPinning,
      columnVisibility: query.columnVisibility,
      globalFilter: query.q,
      pagination: { pageIndex: query.pageIndex, pageSize: query.pageSize },
      sorting: query.sorting,
    },
  });
  const pageCount = table.getPageCount();
  const waiting =
    !options.enabled ||
    projectList.isPending ||
    (projectId !== null && (statuses.isPending || listed.isPending));
  const isReady =
    !waiting &&
    projectList.errorMessage === null &&
    project !== null &&
    !statuses.isError &&
    !(listed.isError && listed.data === undefined);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const current = queryRef.current;

    if (pageCount === 0) {
      if (current.pageIndex !== 0) {
        commitRef.current({ ...current, pageIndex: 0 });
      }

      return;
    }

    if (current.pageIndex >= pageCount) {
      commitRef.current({ ...current, pageIndex: pageCount - 1 });
    }
  }, [isReady, pageCount, query]);

  if (waiting) {
    return { status: "loading" };
  }

  if (projectList.errorMessage !== null) {
    return { message: projectList.errorMessage, retry: projectList.retry, status: "error" };
  }

  if (project === null) {
    return { status: "not-found" };
  }

  if (statuses.isError || (listed.isError && listed.data === undefined)) {
    return {
      message: "The issue list could not be loaded.",
      retry: () => {
        void statuses.refetch();
        void listed.refetch();
      },
      status: "error",
    };
  }

  const access = {
    organizationRole: options.organizationRole,
    projectRole: project.role,
    visibility: project.visibility,
  };
  const canCreate = canPerformProjectAction("create-issue", access);
  const chosenIds = Object.keys(selectedIds);

  return {
    status: "ready",
    view: {
      canCreate,
      canDelete: canDeleteIssues,
      deleteSelected,
      facets: listed.data?.facets ?? null,
      isSelected: (issueId) => selectedIds[issueId] === true,
      togglePage: (issueIds, selected) => {
        togglePageSelection(selection, issueIds, selected);
        logSelectedIssues(selectedIssueSummaries(rows, selectedIds, issueIds, selected));
      },
      toggleSelected: (issueId, selected) => {
        toggleSelection(selection, issueId, selected);
        logSelectedIssues(selectedIssueSummaries(rows, selectedIds, [issueId], selected));
      },
      assignees,
      hasFilters: issueTableHasFilters(query),
      issueForm,
      members: memberList,
      membersError:
        cachedMembers === undefined && members.isError
          ? "Project members could not be loaded."
          : null,
      onClearFilters: () => {
        setSearchInput("");
        commit({ ...query, columnFilters: [], pageIndex: 0, q: "" });
      },
      onClearSearch: () => {
        setSearchInput("");

        if (query.q.length > 0) {
          commit({ ...query, pageIndex: 0, q: "" });
        }
      },
      onCreate: () => {
        if (canCreate) {
          issueForm.openCreate();
        }
      },
      onDeleteSelected: () => {
        deleteSelected.request(chosenIds);
      },
      onSearchChange: setSearchInput,
      openIssue: (issue) => {
        issueForm.openEdit(issue);
      },
      rows,
      search: searchInput,
      selectedCount: chosenIds.length,
      statuses: statusList,
      table,
      truncated: null,
    },
  };
}

function selectedIssueSummaries(
  rows: readonly IssueTableRow[],
  current: Record<string, true>,
  issueIds: readonly string[],
  selected: boolean,
): IssueSummary[] {
  const next = { ...current };

  for (const issueId of issueIds) {
    if (selected) {
      next[issueId] = true;
    } else {
      delete next[issueId];
    }
  }

  return rows.flatMap((row) => (next[row.id] === true ? [row.issue] : []));
}

export { useIssueTable, type IssueTableState };
