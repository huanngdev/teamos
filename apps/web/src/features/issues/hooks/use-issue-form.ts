import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  issuePrioritySchema,
  type IssuePriority,
  type IssueSummary,
  type ProjectStatusSummary,
} from "@teamos/shared";

import { notify } from "@/shared";
import { createIssue, deleteIssue, updateIssue } from "../api/issue-api";
import { readIssueError } from "../lib/issue-errors";
import { issueKeys } from "../query-keys";

const UNASSIGNED = "unassigned";

interface IssueFormState {
  assigneeMemberId: string;
  canDelete: boolean;
  cancelDelete: () => void;
  confirmDelete: () => void;
  deleteError: string | null;
  deleteOpen: boolean;
  description: string;
  errorMessage: string | null;
  isPending: boolean;
  isReadOnly: boolean;
  isValid: boolean;
  mode: "closed" | "create" | "edit";
  priority: IssuePriority;
  requestDelete: () => void;
  reset: () => void;
  setAssigneeMemberId: (value: string) => void;
  setDescription: (value: string) => void;
  setPriority: (value: string | null) => void;
  setStatusId: (value: string | null) => void;
  setTitle: (value: string) => void;
  statusId: string;
  submit: () => void;
  title: string;
}

interface UseIssueFormOptions {
  canDeleteIssue: boolean;
  canUpdateIssue: boolean;
  organizationSlug: string;
  projectId: string | null;
  statuses: readonly ProjectStatusSummary[];
}

function useIssueForm(options: UseIssueFormOptions): IssueFormState & {
  openCreate: (statusId?: string) => void;
  openEdit: (issue: IssueSummary) => void;
} {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"closed" | "create" | "edit">("closed");
  const [issueId, setIssueId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusIdState] = useState("");
  const [omitStatusOnCreate, setOmitStatusOnCreate] = useState(false);
  const [priority, setPriorityState] = useState<IssuePriority>("none");
  const [assigneeMemberId, setAssigneeMemberId] = useState(UNASSIGNED);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const defaultStatusId =
    options.statuses.find((status) => status.isDefault)?.id ?? options.statuses[0]?.id ?? "";

  const invalidate = async () => {
    if (options.projectId === null) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: issueKeys(options.organizationSlug, options.projectId).prefix(),
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (options.projectId === null) {
        throw new Error("Project is not ready.");
      }

      const descriptionValue = description.trim();
      const request = {
        ...(assigneeMemberId === UNASSIGNED ? { assigneeMemberId: null } : { assigneeMemberId }),
        ...(descriptionValue.length > 0 ? { description: descriptionValue } : {}),
        priority,
        title: title.trim(),
        ...(!omitStatusOnCreate && statusId.length > 0 ? { statusId } : {}),
      };

      if (mode === "edit" && issueId !== null) {
        return updateIssue(options.organizationSlug, options.projectId, issueId, {
          ...request,
          description: descriptionValue.length > 0 ? descriptionValue : null,
        });
      }

      return createIssue(options.organizationSlug, options.projectId, request);
    },
    onSuccess: async () => {
      await invalidate();
      notify.success(mode === "edit" ? "Issue updated" : "Issue created");
      reset();
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (options.projectId === null || issueId === null) {
        throw new Error("Issue is not ready.");
      }

      await deleteIssue(options.organizationSlug, options.projectId, issueId);
    },
    onSuccess: async () => {
      await invalidate();
      notify.success("Issue deleted");
      reset();
    },
  });

  function reset() {
    setMode("closed");
    setIssueId(null);
    setTitle("");
    setDescription("");
    setStatusIdState(defaultStatusId);
    setOmitStatusOnCreate(false);
    setPriorityState("none");
    setAssigneeMemberId(UNASSIGNED);
    setDeleteOpen(false);
    save.reset();
    remove.reset();
  }

  return {
    assigneeMemberId,
    canDelete: options.canDeleteIssue && mode === "edit",
    cancelDelete: () => {
      setDeleteOpen(false);
    },
    confirmDelete: () => {
      remove.mutate();
    },
    deleteError: readIssueError(remove.error, "The issue could not be deleted."),
    deleteOpen,
    description,
    errorMessage: readIssueError(
      save.error,
      mode === "edit" ? "The issue could not be updated." : "The issue could not be created.",
    ),
    isPending: save.isPending || remove.isPending,
    isReadOnly: mode === "edit" && !options.canUpdateIssue,
    isValid: title.trim().length > 0,
    mode,
    openCreate: (nextStatusId?: string) => {
      save.reset();
      setMode("create");
      setIssueId(null);
      setTitle("");
      setDescription("");
      setPriorityState("none");
      setAssigneeMemberId(UNASSIGNED);
      setStatusIdState(nextStatusId ?? defaultStatusId);
      setOmitStatusOnCreate(nextStatusId === undefined);
      setDeleteOpen(false);
    },
    openEdit: (issue) => {
      save.reset();
      setMode("edit");
      setIssueId(issue.id);
      setTitle(issue.title);
      setDescription(issue.description ?? "");
      setStatusIdState(issue.statusId);
      setOmitStatusOnCreate(false);
      setPriorityState(issue.priority);
      setAssigneeMemberId(issue.assigneeMemberId ?? UNASSIGNED);
      setDeleteOpen(false);
    },
    priority,
    requestDelete: () => {
      setDeleteOpen(true);
    },
    reset,
    setAssigneeMemberId,
    setDescription,
    setPriority: (value) => {
      const parsed = issuePrioritySchema.safeParse(value);

      if (parsed.success) {
        setPriorityState(parsed.data);
      }
    },
    setStatusId: (value) => {
      if (value === null) {
        return;
      }

      setStatusIdState(value);
      setOmitStatusOnCreate(false);
    },
    setTitle,
    statusId,
    submit: () => {
      if (
        save.isPending ||
        title.trim().length === 0 ||
        (mode === "edit" && !options.canUpdateIssue)
      ) {
        return;
      }

      save.mutate();
    },
    title,
  };
}

export { UNASSIGNED, useIssueForm, type IssueFormState };
