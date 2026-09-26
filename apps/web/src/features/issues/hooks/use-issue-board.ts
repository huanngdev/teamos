import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import {
  canPerformProjectAction,
  type IssueSummary,
  type OrganizationRole,
  type ProjectMember,
  type ProjectStatusSummary,
} from "@teamos/shared";

import { listProjectMembers, useProjectList } from "@/features/projects";
import { projectKeys } from "@/features/projects/query-keys";
import { memberCacheKey, notify, useShellStore } from "@/shared";
import { boardKey, useBoardStore } from "../stores/board-store";
import {
  listIssues,
  listProjectStatuses,
  updateIssue,
  updateProjectStatus,
} from "../api/issue-api";
import {
  columnDropIndex,
  groupBoardColumns,
  issueDropTarget,
  type BoardColumn,
} from "../lib/board-columns";
import { readIssueError } from "../lib/issue-errors";
import { parseDragId } from "../query-keys";
import { useColumnForm, type ColumnFormState, type DeleteColumnState } from "./use-column-form";
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
    overId: string,
    issueSlot: { index: number; statusId: string } | null,
    columnIndex: number | null,
  ) => void;
  onEditIssue: (issueId: string) => void;
  onRenameColumn: (statusId: string) => void;
  retry: () => void;
  truncated: { shown: number; total: number } | null;
}

function useIssueBoard(options: UseIssueBoardOptions): IssueBoardState {
  const moveGeneration = useRef(0);
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
    queryKey: [
      "organization",
      options.organizationSlug,
      "projects",
      projectId,
      "issues",
      "statuses",
    ],
  });
  const cards = useQuery({
    enabled: options.enabled && projectId !== null,
    queryFn: async () => {
      const result = await listIssues(options.organizationSlug, projectId ?? "");
      if (projectId !== null) {
        useBoardStore
          .getState()
          .setIssues(boardKey(options.organizationSlug, projectId), result.issues, result.total);
      }

      return result;
    },
    queryKey: ["organization", options.organizationSlug, "projects", projectId, "issues", "cards"],
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
  const columns = useMemo(
    () =>
      groupBoardColumns(
        cachedBoard?.statuses ?? statuses.data ?? [],
        cachedBoard?.issues ?? cards.data?.issues ?? [],
      ),
    [cachedBoard?.issues, cachedBoard?.statuses, cards.data?.issues, statuses.data],
  );
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
  const moveIssue = useMutation({
    mutationFn: (input: {
      generation: number;
      index: number;
      issueId: string;
      previous: { issues: IssueSummary[]; statuses: ProjectStatusSummary[]; total: number };
      statusId: string;
    }) => {
      if (projectId === null) {
        throw new Error("Project is not ready.");
      }

      return updateIssue(options.organizationSlug, projectId, input.issueId, {
        index: input.index,
        statusId: input.statusId,
      });
    },
    onError: (error, variables) => {
      if (variables.generation !== moveGeneration.current || projectId === null) {
        return;
      }

      useBoardStore
        .getState()
        .setBoard(boardKey(options.organizationSlug, projectId), variables.previous);
      notify.error(
        readIssueError(error, "The issue could not be moved.") ?? "The issue could not be moved.",
      );
    },
  });
  const moveColumn = useMutation({
    mutationFn: (input: {
      generation: number;
      index: number;
      previous: { issues: IssueSummary[]; statuses: ProjectStatusSummary[]; total: number };
      statusId: string;
    }) => {
      if (projectId === null) {
        throw new Error("Project is not ready.");
      }

      return updateProjectStatus(options.organizationSlug, projectId, input.statusId, {
        index: input.index,
      });
    },
    onError: (error, variables) => {
      if (variables.generation !== moveGeneration.current || projectId === null) {
        return;
      }

      useBoardStore
        .getState()
        .setBoard(boardKey(options.organizationSlug, projectId), variables.previous);
      notify.error(
        readIssueError(error, "The column could not be moved.") ??
          "The column could not be moved.",
      );
    },
  });

  if (
    !options.enabled ||
    projectList.isPending ||
    (projectId !== null && (statuses.isPending || cards.isPending))
  ) {
    return { status: "loading" };
  }

  if (projectList.errorMessage !== null) {
    return { message: projectList.errorMessage, retry: projectList.retry, status: "error" };
  }

  if (project === null) {
    return { status: "not-found" };
  }

  if (statuses.isError || cards.isError) {
    return {
      message: "The board could not be loaded.",
      retry: () => {
        void statuses.refetch();
        void cards.refetch();
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
  const issues = cachedBoard?.issues ?? cards.data?.issues ?? [];
  const total = cachedBoard?.total ?? cards.data?.total ?? issues.length;

  return {
    status: "ready",
    view: {
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
      onDrop: (activeId, overId, issueSlot, columnIndex) => {
        const active = parseDragId(activeId);
        const over = parseDragId(overId);

        if (active === null || over === null || projectId === null) {
          return;
        }

        if (active.kind === "issue" && canUpdateIssue) {
          const target = issueSlot ?? issueDropTarget(columns, active.id, over.id);
          const source = columns.find((column) =>
            column.issues.some((issue) => issue.id === active.id),
          );
          const sourceIndex = source?.issues.findIndex((issue) => issue.id === active.id) ?? -1;

          if (
            target === null ||
            (source !== undefined &&
              target.statusId === source.status.id &&
              target.index === sourceIndex)
          ) {
            return;
          }

          const generation = moveGeneration.current + 1;
          moveGeneration.current = generation;
          const key = boardKey(options.organizationSlug, projectId);
          const previous = rememberBoard(key, columns, total);
          useBoardStore.getState().moveIssue(key, active.id, target.statusId, target.index);
          moveIssue.mutate({
            generation,
            index: target.index,
            issueId: active.id,
            previous,
            statusId: target.statusId,
          });

          return;
        }

        if (active.kind === "column" && canUpdateProject) {
          const index = columnIndex ?? columnDropIndex(columns, active.id, over.id);

          if (index !== null) {
            const generation = moveGeneration.current + 1;
            moveGeneration.current = generation;
            const key = boardKey(options.organizationSlug, projectId);
            const previous = rememberBoard(key, columns, total);
            useBoardStore.getState().moveColumn(key, active.id, index);
            moveColumn.mutate({ generation, index, previous, statusId: active.id });
          }
        }
      },
      onEditIssue: (issueId) => {
        const issue = issues.find((item) => item.id === issueId);

        if (issue !== undefined) {
          issueForm.openEdit(issue);
        }
      },
      onRenameColumn: (statusId) => {
        const status = columns.find((column) => column.status.id === statusId)?.status;

        if (status !== undefined) {
          columnForm.openRename(status);
        }
      },
      retry: () => {
        void statuses.refetch();
        void cards.refetch();
      },
      truncated: total > issues.length ? { shown: issues.length, total } : null,
    },
  };
}

function rememberBoard(
  key: string,
  columns: BoardColumn[],
  total: number,
): { issues: IssueSummary[]; statuses: ProjectStatusSummary[]; total: number } {
  const existing = useBoardStore.getState().boards[key];

  if (existing !== undefined) {
    return existing;
  }

  const seeded = {
    issues: columns.flatMap((column) => column.issues),
    statuses: columns.map((column) => column.status),
    total,
  };
  useBoardStore.getState().setBoard(key, seeded);

  return seeded;
}

export { useIssueBoard, type IssueBoardState, type IssueBoardView };
