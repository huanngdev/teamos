import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  canPerformProjectAction,
  type OrganizationRole,
  type ProjectMember,
  type ProjectStatusSummary,
} from "@teamos/shared";

import { listProjectMembers, useEligibleAssignees, useProjectList } from "@/features/projects";
import type { EligibleAssigneePicker } from "@/features/projects";
import { projectKeys } from "@/features/projects/query-keys";
import { memberCacheKey, notify, useShellStore } from "@/shared";
import { listProjectStatuses, updateProjectStatus } from "../api/issue-api";
import { applyColumnMove, type BoardColumn } from "../lib/board-columns";
import { readIssueError } from "../lib/issue-errors";
import { placementForDrop } from "../lib/issue-placement";
import { issueKeys, parseDragId } from "../query-keys";
import { useColumnForm, type ColumnFormState, type DeleteColumnState } from "./use-column-form";
import { useColumnPages } from "./use-column-pages";
import { useIssueForm, type IssueFormState } from "./use-issue-form";

interface UseIssueBoardOptions {
  enabled: boolean;
  organizationRole: OrganizationRole;
  organizationSlug: string;
  projectSlug: string;
}

type IssueBoardState =
  | { status: "loading" }
  | { status: "not-found" }
  | { message: string; retry: () => void; status: "error" }
  | { status: "ready"; view: IssueBoardView };

interface IssueBoardView {
  canCreateIssue: boolean;
  canUpdateIssue: boolean;
  canUpdateProject: boolean;
  columns: BoardColumn[];
  assignees: EligibleAssigneePicker;
  columnForm: ColumnFormState;
  deleteColumn: DeleteColumnState;
  issueForm: IssueFormState;
  members: ProjectMember[];
  membersError: string | null;
  onCreateColumn: () => void;
  onCreateIssue: (statusId?: string) => void;
  onDeleteColumn: (statusId: string) => void;
  onDrop: (
    activeId: string,
    issueSlot: { index: number; statusId: string } | null,
    columnIndex: number | null,
  ) => void;
  onEditIssue: (issueId: string) => void;
  onLoadMore: (statusId: string) => void;
  onLoadPrevious: (statusId: string) => void;
  onRenameColumn: (statusId: string) => void;
  retry: () => void;
  truncated: { shown: number; total: number } | null;
}

function useIssueBoard(options: UseIssueBoardOptions): IssueBoardState {
  const queryClient = useQueryClient();
  const projectList = useProjectList({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
  });
  const project = projectList.projects.find((item) => item.slug === options.projectSlug) ?? null;
  const projectId = project?.id ?? null;
  const statusKey =
    projectId === null
      ? (["issues", "statuses", "pending"] as const)
      : issueKeys(options.organizationSlug, projectId).statuses();
  const statuses = useQuery({
    enabled: options.enabled && projectId !== null,
    queryFn: () => listProjectStatuses(options.organizationSlug, projectId ?? ""),
    queryKey: statusKey,
  });
  const pages = useColumnPages({
    enabled: options.enabled && projectId !== null,
    organizationSlug: options.organizationSlug,
    params: {},
    projectId,
    statuses: statuses.data ?? [],
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
  const columns = pages.columns;
  const assignees = useEligibleAssignees({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
    projectId,
  });
  const issueForm = useIssueForm({
    canDeleteIssue:
      project !== null &&
      canPerformProjectAction("delete-issue", {
        organizationRole: options.organizationRole,
        projectRole: project.role,
        visibility: project.visibility,
      }),
    canUpdateIssue:
      project !== null &&
      canPerformProjectAction("update-issue", {
        organizationRole: options.organizationRole,
        projectRole: project.role,
        visibility: project.visibility,
      }),
    organizationSlug: options.organizationSlug,
    projectId,
    statuses: statuses.data ?? [],
  });
  const columnForm = useColumnForm({
    organizationSlug: options.organizationSlug,
    projectId,
  });
  const moveColumn = useMutation({
    mutationFn: (input: { index: number; previous: ProjectStatusSummary[]; statusId: string }) => {
      if (projectId === null) {
        throw new Error("Project is not ready.");
      }

      return updateProjectStatus(options.organizationSlug, projectId, input.statusId, {
        index: input.index,
      });
    },
    onError: (error, variables) => {
      queryClient.setQueryData(statusKey, variables.previous);
      notify.error(
        readIssueError(error, "The column could not be moved.") ?? "The column could not be moved.",
      );
    },
  });

  if (
    !options.enabled ||
    projectList.isPending ||
    (projectId !== null && (statuses.isPending || pages.isPending))
  ) {
    return { status: "loading" };
  }

  if (projectList.errorMessage !== null) {
    return { message: projectList.errorMessage, retry: projectList.retry, status: "error" };
  }

  if (project === null) {
    return { status: "not-found" };
  }

  if (statuses.isError || pages.isError) {
    return {
      message: "The board could not be loaded.",
      retry: () => {
        void statuses.refetch();
        pages.retry();
      },
      status: "error",
    };
  }

  const access = {
    organizationRole: options.organizationRole,
    projectRole: project.role,
    visibility: project.visibility,
  };
  const canCreateIssue = canPerformProjectAction("create-issue", access);
  const canUpdateIssue = canPerformProjectAction("update-issue", access);
  const canUpdateProject = canPerformProjectAction("update", access);

  return {
    status: "ready",
    view: {
      assignees,
      canCreateIssue,
      canUpdateIssue,
      canUpdateProject,
      columns,
      columnForm: columnForm.form,
      deleteColumn: columnForm.deleteColumn,
      issueForm,
      members: cachedMembers ?? members.data ?? [],
      membersError:
        cachedMembers === undefined && members.isError
          ? "Project members could not be loaded."
          : null,
      onCreateColumn: columnForm.openCreate,
      onCreateIssue: (statusId) => {
        if (!canCreateIssue) {
          return;
        }

        issueForm.openCreate(statusId);
      },
      onDeleteColumn: (statusId) => {
        const status = columns.find((column) => column.status.id === statusId)?.status;

        if (status !== undefined) {
          columnForm.openDelete(status);
        }
      },
      onDrop: (activeId, issueSlot, columnIndex) => {
        const active = parseDragId(activeId);

        if (active === null || projectId === null) {
          return;
        }

        if (active.kind === "issue" && canUpdateIssue) {
          const target = issueSlot;
          const source = columns.find((column) =>
            column.issues.some((issue) => issue.id === active.id),
          );
          const destination =
            target === null
              ? undefined
              : columns.find((column) => column.status.id === target.statusId);
          const sourceIndex = source?.issues.findIndex((issue) => issue.id === active.id) ?? -1;

          if (
            target === null ||
            destination === undefined ||
            (source !== undefined &&
              target.statusId === source.status.id &&
              target.index === sourceIndex)
          ) {
            return;
          }

          const moving = source?.issues.find((issue) => issue.id === active.id);

          void pages.moveIssue({
            index: target.index,
            issueId: active.id,
            request: {
              placement: placementForDrop(
                destination.issues,
                active.id,
                target.index,
                destination.skippedBefore,
              ),
              statusId: target.statusId,
              ...(moving === undefined ? {} : { expectedUpdatedAt: moving.updatedAt }),
            },
            statusId: target.statusId,
          });

          return;
        }

        if (active.kind === "column" && canUpdateProject) {
          const index = columnIndex;
          const previous = statuses.data ?? [];

          if (index !== null && projectId !== null) {
            queryClient.setQueryData(statusKey, applyColumnMove(previous, active.id, index));
            moveColumn.mutate({ index, previous, statusId: active.id });
          }
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
      onRenameColumn: (statusId) => {
        const status = columns.find((column) => column.status.id === statusId)?.status;

        if (status !== undefined) {
          columnForm.openRename(status);
        }
      },
      retry: () => {
        void statuses.refetch();
        pages.retry();
      },
      truncated: null,
    },
  };
}

export { useIssueBoard, type IssueBoardState, type IssueBoardView };
