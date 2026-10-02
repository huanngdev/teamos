import {
  canManageListedIssueView,
  canPerformProjectAction,
  findStaleIssueViewReferences,
  type OrganizationRole,
} from "@teamos/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import {
  issueKeys,
  useColumnPages,
  useColumnForm,
  useIssueForm,
  type BoardColumn,
  type ColumnFormState,
  type DeleteColumnState,
  type IssueFormState,
} from "@/features/issues";
import {
  useEligibleAssigneeLookup,
  useEligibleAssignees,
  useProjectList,
} from "@/features/projects";
import type { EligibleAssigneePicker } from "@/features/projects";
import { notify } from "@/shared";
import { deleteIssueView, getIssueView, updateIssueView } from "../api/issue-view-api";
import { removeCachedIssueView } from "../lib/issue-view-cache";
import { issueViewListParams } from "../lib/issue-view-draft";
import { isMissingIssueView, readIssueViewError } from "../lib/issue-view-errors";
import { issueMatchesViewColumns, issueViewMoveRequest } from "../lib/issue-view-move";
import { projectViewsPath } from "../lib/issue-view-paths";
import { issueViewKeys } from "../query-keys";
import { useIssueViewHeaderStore } from "../stores/issue-view-header-store";
import { useIssueViewCatalog, type IssueViewCatalog } from "./use-issue-view-catalog";
import {
  useIssueViewForm,
  type IssueViewFormState,
  type IssueViewFormSubmit,
} from "./use-issue-view-form";

interface IssueViewBoardReady {
  assignees: EligibleAssigneePicker;
  canCreateIssue: boolean;
  canManage: boolean;
  canUpdateIssue: boolean;
  canUpdateProject: boolean;
  catalog: IssueViewCatalog;
  columnForm: ColumnFormState;
  columns: BoardColumn[];
  deleteColumn: DeleteColumnState;
  deleteOpen: boolean;
  form: IssueViewFormState;
  knownAssignees: EligibleAssigneePicker["assignees"];
  viewAssignees: EligibleAssigneePicker;
  formError: string | null;
  issueForm: IssueFormState;
  name: string;
  onCancelDelete: () => void;
  onCreateColumn: () => void;
  onCreateIssue: (statusId: string) => void;
  onDelete: () => void;
  onDeleteColumn: (statusId: string) => void;
  onEditIssue: (issueId: string) => void;
  onLoadMore: (statusId: string) => void;
  onLoadPrevious: (statusId: string) => void;
  onMoveIssue: (issueId: string, statusId: string, index: number) => void;
  onRenameColumn: (statusId: string) => void;
  stale: boolean;
  truncated: { shown: number; total: number } | null;
}

type IssueViewBoardState =
  | { status: "loading" }
  | { status: "not-found" }
  | { message: string; retry: () => void; status: "error" }
  | { status: "ready"; view: IssueViewBoardReady };

function useIssueViewBoard(options: {
  enabled: boolean;
  organizationRole: OrganizationRole;
  organizationSlug: string;
  projectSlug: string;
  viewId: string;
}): IssueViewBoardState {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectList = useProjectList({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
  });
  const project = projectList.projects.find((item) => item.slug === options.projectSlug) ?? null;
  const projectId = project?.id ?? null;
  const viewQuery = useQuery({
    enabled: options.enabled && projectId !== null && options.viewId.length > 0,
    queryFn: () => getIssueView(options.organizationSlug, projectId ?? "", options.viewId),
    queryKey:
      projectId === null
        ? ["issue-views", "pending", options.viewId]
        : issueViewKeys(options.organizationSlug, projectId).detail(options.viewId),
  });
  const saved = viewQuery.data;
  const params = saved === undefined ? {} : issueViewListParams(saved.definition);
  const catalog = useIssueViewCatalog({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
    projectId,
  });
  const pages = useColumnPages({
    enabled: options.enabled && projectId !== null && saved !== undefined,
    organizationSlug: options.organizationSlug,
    params,
    projectId,
    statuses: catalog.statuses,
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
  const canUpdateIssue = access !== null && canPerformProjectAction("update-issue", access);
  const canCreateIssue = access !== null && canPerformProjectAction("create-issue", access);
  const canDeleteIssue = access !== null && canPerformProjectAction("delete-issue", access);
  const canManage =
    saved !== undefined &&
    canManageListedIssueView(saved.visibility, { canUpdateProject, canViewProject });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const issueForm = useIssueForm({
    canDeleteIssue,
    canUpdateIssue,
    organizationSlug: options.organizationSlug,
    projectId,
    statuses: catalog.statuses,
  });
  const columnForm = useColumnForm({
    organizationSlug: options.organizationSlug,
    projectId,
  });
  const resetForm = useRef<() => void>(() => undefined);
  const resetSave = useRef<() => void>(() => undefined);
  const openEdit = useRef<(view: NonNullable<typeof saved>) => void>(() => undefined);
  const save = useMutation({
    mutationFn: async (input: IssueViewFormSubmit) => {
      if (projectId === null || input.mode !== "edit") {
        throw new Error("View is not ready.");
      }

      return updateIssueView(options.organizationSlug, projectId, input.id, {
        definition: input.definition,
        expectedRevision: input.expectedRevision,
        name: input.name,
        visibility: input.visibility,
      });
    },
    onSuccess: async (updated) => {
      if (projectId !== null) {
        queryClient.setQueryData(
          issueViewKeys(options.organizationSlug, projectId).detail(updated.id),
          updated,
        );
        await queryClient.invalidateQueries({
          queryKey: issueViewKeys(options.organizationSlug, projectId).prefix(),
        });
        await queryClient.invalidateQueries({
          queryKey: issueKeys(options.organizationSlug, projectId).prefix(),
        });
      }

      resetForm.current();
      notify.success("View saved.");
    },
  });
  const form = useIssueViewForm({
    canCreateProjectView: canUpdateProject,
    isPending: save.isPending,
    onSubmit: (value) => {
      if (value.mode === "edit") {
        save.mutate(value);
      }
    },
  });
  resetForm.current = form.reset;
  resetSave.current = save.reset;
  openEdit.current = form.openEdit;
  const assignees = useEligibleAssignees({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
    projectId,
  });
  const viewAssignees = useEligibleAssignees({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
    projectId,
  });
  const savedMemberIds = saved?.definition.filters.assignee?.memberIds ?? [];
  const formMemberIds = form.selectedAssignees.filter(
    (token) => token !== "me" && token !== "unassigned",
  );
  const knownAssigneeQuery = useEligibleAssigneeLookup({
    enabled: options.enabled && projectId !== null,
    ids: [...new Set([...savedMemberIds, ...formMemberIds])],
    organizationSlug: options.organizationSlug,
    projectId,
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (projectId === null) {
        throw new Error("View is not ready.");
      }

      await deleteIssueView(options.organizationSlug, projectId, options.viewId);
    },
    onError: (error) => {
      notify.error(readIssueViewError(error, "The view could not be deleted."));
    },
    onSuccess: async () => {
      if (projectId !== null) {
        removeCachedIssueView(queryClient, options.organizationSlug, projectId, options.viewId);
        await queryClient.invalidateQueries({
          queryKey: issueViewKeys(options.organizationSlug, projectId).prefix(),
        });
      }

      notify.success("View deleted.");
      await navigate(projectViewsPath(options.organizationSlug, options.projectSlug));
    },
  });
  useEffect(() => {
    return () => {
      useIssueViewHeaderStore.getState().clear();
    };
  }, []);

  useEffect(() => {
    if (saved === undefined) {
      useIssueViewHeaderStore.getState().clear();
      return;
    }

    useIssueViewHeaderStore.getState().setActions({
      canManage,
      onDelete: () => {
        setDeleteOpen(true);
      },
      onEdit: () => {
        const current = viewQuery.data;

        if (current !== undefined) {
          resetSave.current();
          openEdit.current(current);
        }
      },
    });
  }, [canManage, saved, viewQuery.data]);

  if (
    !options.enabled ||
    projectList.isPending ||
    (projectId !== null && (viewQuery.isPending || catalog.isPending))
  ) {
    return { status: "loading" };
  }

  if (projectList.errorMessage !== null) {
    return { message: projectList.errorMessage, retry: projectList.retry, status: "error" };
  }

  if (project === null || !canViewProject) {
    return { status: "not-found" };
  }

  if (viewQuery.isError) {
    if (isMissingIssueView(viewQuery.error)) {
      return { status: "not-found" };
    }

    return {
      message: readIssueViewError(viewQuery.error, "The view could not be loaded."),
      retry: () => {
        void viewQuery.refetch();
      },
      status: "error",
    };
  }

  if (saved === undefined) {
    return { status: "not-found" };
  }

  if (pages.isPending) {
    return { status: "loading" };
  }

  if (catalog.statusError || pages.isError) {
    return {
      message: "The board could not be loaded.",
      retry: () => {
        catalog.retry();
        pages.retry();
      },
      status: "error",
    };
  }

  const columns = pages.columns;
  const knownAssignees = knownAssigneeQuery.data?.assignees ?? [];
  const staleReferences = findStaleIssueViewReferences(saved.definition, {
    memberIds: knownAssigneeQuery.isSuccess
      ? knownAssignees.map((assignee) => assignee.id)
      : savedMemberIds,
    statusIds: catalog.statuses.map((status) => status.id),
  });
  const stale =
    staleReferences.statusIds.length > 0 ||
    (knownAssigneeQuery.isSuccess && staleReferences.memberIds.length > 0);

  return {
    status: "ready",
    view: {
      assignees,
      canCreateIssue,
      canManage,
      canUpdateIssue,
      canUpdateProject,
      catalog,
      columnForm: columnForm.form,
      columns,
      deleteColumn: columnForm.deleteColumn,
      deleteOpen,
      form,
      knownAssignees,
      viewAssignees,
      formError:
        save.error === null ? null : readIssueViewError(save.error, "The view could not be saved."),
      issueForm,
      name: saved.name,
      onCancelDelete: () => {
        setDeleteOpen(false);
      },
      onCreateColumn: columnForm.openCreate,
      onCreateIssue: (statusId) => {
        if (canCreateIssue) {
          issueForm.openCreate(statusId);
        }
      },
      onDelete: () => {
        remove.mutate();
      },
      onDeleteColumn: (statusId) => {
        const status = columns.find((column) => column.status.id === statusId)?.status;

        if (status !== undefined) {
          columnForm.openDelete(status);
        }
      },
      onEditIssue: (issueId) => {
        const issue = columns
          .flatMap((column) => column.issues)
          .find((item) => item.id === issueId);

        if (issue !== undefined) {
          issueForm.openEdit(issue);
        }
      },
      onLoadMore: pages.loadMore,
      onLoadPrevious: pages.loadPrevious,
      onMoveIssue: (issueId, statusId, index) => {
        if (!canUpdateIssue || projectId === null) {
          return;
        }

        const source = columns.find((column) =>
          column.issues.some((issue) => issue.id === issueId),
        );
        const destination = columns.find((column) => column.status.id === statusId);
        const moving = source?.issues.find((issue) => issue.id === issueId);
        const sourceIndex = source?.issues.findIndex((issue) => issue.id === issueId) ?? -1;

        if (moving === undefined || destination === undefined) {
          return;
        }

        const request = issueViewMoveRequest({
          currentStatusId: moving.statusId,
          destinationIssues: destination.issues,
          destinationStatusId: statusId,
          index,
          movingId: issueId,
          skippedBefore: destination.skippedBefore,
          sourceIndex,
        });

        if (request === null) {
          return;
        }

        if (
          moving.statusId !== statusId &&
          !issueMatchesViewColumns({ statusId }, saved.definition, catalog.statuses)
        ) {
          notify.success("Moved. It no longer matches this view.");
        }

        void pages.moveIssue({
          index,
          issueId,
          request: {
            expectedUpdatedAt: moving.updatedAt,
            placement: request.placement,
            statusId: request.statusId,
          },
          retain: (issue) => issueMatchesViewColumns(issue, saved.definition, catalog.statuses),
          statusId,
        });
      },
      onRenameColumn: (statusId) => {
        const status = columns.find((column) => column.status.id === statusId)?.status;

        if (status !== undefined) {
          columnForm.openRename(status);
        }
      },
      stale,
      truncated: null,
    },
  };
}

export { useIssueViewBoard, type IssueViewBoardState };
