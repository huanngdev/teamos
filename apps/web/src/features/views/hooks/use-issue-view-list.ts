import {
  canManageListedIssueView,
  canPerformProjectAction,
  describeIssueViewFilters,
  formatDateTime,
  getIssueViewVisibilityLabel,
  ISSUE_VIEW_LIST_DEFAULT_LIMIT,
  type IssueViewVisibility,
  type OrganizationRole,
} from "@teamos/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useProjectList } from "@/features/projects";
import { notify, useDebouncedValue } from "@/shared";
import {
  createIssueView,
  deleteIssueView,
  listIssueViews,
  updateIssueView,
} from "../api/issue-view-api";
import { readIssueViewError } from "../lib/issue-view-errors";
import { projectViewPath } from "../lib/issue-view-paths";
import { issueViewKeys } from "../query-keys";
import {
  useEligibleAssigneeLookup,
  useEligibleAssignees,
  type EligibleAssigneePicker,
} from "@/features/projects";
import { useIssueViewCatalog, type IssueViewCatalog } from "./use-issue-view-catalog";
import {
  useIssueViewForm,
  type IssueViewFormState,
  type IssueViewFormSubmit,
} from "./use-issue-view-form";

interface IssueViewListItem {
  canManage: boolean;
  id: string;
  name: string;
  path: string;
  summary: string;
  updatedLabel: string;
  visibility: IssueViewVisibility;
  visibilityLabel: string;
}

interface IssueViewListReady {
  assignees: EligibleAssigneePicker;
  catalog: IssueViewCatalog;
  knownAssignees: EligibleAssigneePicker["assignees"];
  deleteName: string | null;
  form: IssueViewFormState;
  formError: string | null;
  hasNext: boolean;
  hasPrevious: boolean;
  isSearching: boolean;
  items: IssueViewListItem[];
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onCreate: () => void;
  onDelete: (viewId: string) => void;
  onEdit: (viewId: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSearchChange: (value: string) => void;
  rangeEnd: number;
  rangeStart: number;
  search: string;
  total: number;
}

type IssueViewListState =
  | { status: "loading" }
  | { status: "not-found" }
  | { message: string; retry: () => void; status: "error" }
  | { status: "ready"; view: IssueViewListReady };

function summaryText(
  definition: Parameters<typeof describeIssueViewFilters>[0],
  names: Parameters<typeof describeIssueViewFilters>[1],
): string {
  const labels = describeIssueViewFilters(definition, names);

  return labels.length === 0 ? "All issues" : labels.join(" · ");
}

function optionalError(error: unknown, fallback: string): string | null {
  return error === null || error === undefined ? null : readIssueViewError(error, fallback);
}

function useIssueViewList(options: {
  enabled: boolean;
  organizationRole: OrganizationRole;
  organizationSlug: string;
  projectSlug: string;
}): IssueViewListState {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectList = useProjectList({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
  });
  const project = projectList.projects.find((item) => item.slug === options.projectSlug) ?? null;
  const projectId = project?.id ?? null;
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const appliedSearch = debouncedSearch.trim();
  const [offset, setOffset] = useState(0);
  const [offsetSearch, setOffsetSearch] = useState(appliedSearch);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (offsetSearch !== appliedSearch) {
    setOffsetSearch(appliedSearch);
    setOffset(0);
  }

  const catalog = useIssueViewCatalog({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
    projectId,
  });
  const views = useQuery({
    enabled: options.enabled && projectId !== null,
    placeholderData: keepPreviousData,
    queryFn: () =>
      listIssueViews(options.organizationSlug, projectId ?? "", {
        limit: ISSUE_VIEW_LIST_DEFAULT_LIMIT,
        offset,
        ...(appliedSearch.length === 0 ? {} : { search: appliedSearch }),
      }),
    queryKey:
      projectId === null
        ? ["issue-views", "pending", appliedSearch, offset]
        : issueViewKeys(options.organizationSlug, projectId).list(
            ISSUE_VIEW_LIST_DEFAULT_LIMIT,
            offset,
            appliedSearch,
          ),
  });
  const access =
    project === null
      ? null
      : {
          organizationRole: options.organizationRole,
          projectRole: project.role,
          visibility: project.visibility,
        };
  const canUpdateProject = access !== null && canPerformProjectAction("update", access);
  const canViewProject = access !== null && canPerformProjectAction("view", access);

  async function refresh() {
    if (projectId === null) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: issueViewKeys(options.organizationSlug, projectId).prefix(),
    });
  }

  const resetForm = useRef<() => void>(() => undefined);
  const save = useMutation({
    mutationFn: async (input: IssueViewFormSubmit) => {
      if (projectId === null) {
        throw new Error("Project is not ready.");
      }

      if (input.mode === "edit") {
        return updateIssueView(options.organizationSlug, projectId, input.id, {
          definition: input.definition,
          expectedRevision: input.expectedRevision,
          name: input.name,
        });
      }

      return createIssueView(options.organizationSlug, projectId, {
        definition: input.definition,
        name: input.name,
        visibility: input.visibility,
      });
    },
    onSuccess: async (saved, input) => {
      await refresh();
      resetForm.current();
      notify.success(input.mode === "edit" ? "View saved." : "View created.");

      if (input.mode === "create") {
        await navigate(projectViewPath(options.organizationSlug, options.projectSlug, saved.id));
      }
    },
  });
  const form = useIssueViewForm({
    canCreateProjectView: canUpdateProject,
    isPending: save.isPending,
    onSubmit: (value) => {
      save.mutate(value);
    },
  });
  resetForm.current = form.reset;
  const assignees = useEligibleAssignees({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
    projectId,
  });
  const listedMemberIds = (views.data?.views ?? []).flatMap(
    (item) => item.definition.filters.assignee?.memberIds ?? [],
  );
  const formMemberIds = form.selectedAssignees.filter(
    (token) => token !== "me" && token !== "unassigned",
  );
  const knownAssigneeQuery = useEligibleAssigneeLookup({
    enabled: options.enabled && projectId !== null,
    ids: [...new Set([...listedMemberIds, ...formMemberIds])],
    organizationSlug: options.organizationSlug,
    projectId,
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (projectId === null || deleteId === null) {
        throw new Error("View is not ready.");
      }

      await deleteIssueView(options.organizationSlug, projectId, deleteId);
    },
    onError: (error) => {
      notify.error(readIssueViewError(error, "The view could not be deleted."));
    },
    onSuccess: async () => {
      setDeleteId(null);
      notify.success("View deleted.");
      await refresh();
    },
  });
  const total = views.data?.pagination.total ?? 0;

  useEffect(() => {
    if (views.data !== undefined && offset > 0 && offset >= total && !views.isFetching) {
      setOffset(Math.max(0, offset - ISSUE_VIEW_LIST_DEFAULT_LIMIT));
    }
  }, [offset, total, views.data, views.isFetching]);

  if (!options.enabled || projectList.isPending || (projectId !== null && views.isPending)) {
    return { status: "loading" };
  }

  if (projectList.errorMessage !== null) {
    return { message: projectList.errorMessage, retry: projectList.retry, status: "error" };
  }

  if (project === null || !canViewProject) {
    return { status: "not-found" };
  }

  if (views.isError) {
    return {
      message: readIssueViewError(views.error, "Views could not be loaded."),
      retry: () => {
        void views.refetch();
      },
      status: "error",
    };
  }

  const names = {
    memberName: (memberId: string) =>
      knownAssigneeQuery.data?.assignees.find((assignee) => assignee.id === memberId)?.name ??
      catalog.members.find((member) => member.memberId === memberId)?.name,
    statusName: (statusId: string) =>
      catalog.statuses.find((status) => status.id === statusId)?.name,
  };
  const items = (views.data?.views ?? []).map((item) => ({
    canManage: canManageListedIssueView(item.visibility, { canUpdateProject, canViewProject }),
    id: item.id,
    name: item.name,
    path: projectViewPath(options.organizationSlug, options.projectSlug, item.id),
    summary: summaryText(item.definition, names),
    updatedLabel: formatDateTime(item.updatedAt),
    visibility: item.visibility,
    visibilityLabel: getIssueViewVisibilityLabel(item.visibility),
  }));

  return {
    status: "ready",
    view: {
      assignees,
      catalog,
      knownAssignees: knownAssigneeQuery.data?.assignees ?? [],
      deleteName: views.data?.views.find((item) => item.id === deleteId)?.name ?? null,
      form,
      formError: optionalError(save.error, "The view could not be saved."),
      hasNext: offset + items.length < total,
      hasPrevious: offset > 0,
      isSearching: views.isFetching && appliedSearch.length > 0,
      items,
      onCancelDelete: () => {
        setDeleteId(null);
      },
      onConfirmDelete: () => {
        remove.mutate();
      },
      onCreate: () => {
        save.reset();
        form.openCreate();
      },
      onDelete: setDeleteId,
      onEdit: (viewId) => {
        const item = views.data?.views.find((view) => view.id === viewId);

        if (item === undefined) {
          return;
        }

        save.reset();
        form.openEdit(item);
      },
      onNext: () => {
        setOffset((current) => current + ISSUE_VIEW_LIST_DEFAULT_LIMIT);
      },
      onPrevious: () => {
        setOffset((current) => Math.max(0, current - ISSUE_VIEW_LIST_DEFAULT_LIMIT));
      },
      onSearchChange: setSearchInput,
      rangeEnd: offset + items.length,
      rangeStart: items.length === 0 ? 0 : offset + 1,
      search: searchInput,
      total,
    },
  };
}

export { useIssueViewList, type IssueViewListItem, type IssueViewListState };
