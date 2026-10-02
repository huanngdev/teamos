import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  issuePrioritySchema,
  type EligibleAssignee,
  type IssueCardSummary,
  type IssuePriority,
  type IssueSummary,
  type ProjectStatusSummary,
} from "@teamos/shared";

import { notify } from "@/shared";
import { createIssue, deleteIssue, getIssue, updateIssue } from "../api/issue-api";
import { readIssueError } from "../lib/issue-errors";
import { issueKeys } from "../query-keys";

const UNASSIGNED = "unassigned";

interface IssueFormState {
  assignee: EligibleAssignee | null;
  assigneeMemberId: string;
  canDelete: boolean;
  cancelDelete: () => void;
  confirmDelete: () => void;
  deleteError: string | null;
  deleteOpen: boolean;
  description: string;
  detailError: string | null;
  detailReady: boolean;
  errorMessage: string | null;
  isPending: boolean;
  isReadOnly: boolean;
  isValid: boolean;
  mode: "closed" | "create" | "edit";
  priority: IssuePriority;
  requestDelete: () => void;
  reset: () => void;
  retryDetail: () => void;
  setAssignee: (assignee: EligibleAssignee | null) => void;
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
  openEdit: (issue: IssueCardSummary | IssueSummary) => void;
} {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"closed" | "create" | "edit">("closed");
  const [issueId, setIssueId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusIdState] = useState("");
  const [omitStatusOnCreate, setOmitStatusOnCreate] = useState(false);
  const [priority, setPriorityState] = useState<IssuePriority>("none");
  const [assignee, setAssigneeState] = useState<EligibleAssignee | null>(null);
  const assigneeMemberId = assignee?.id ?? UNASSIGNED;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailReady, setDetailReady] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);
  const detailRequest = useRef(0);
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
          ...(expectedUpdatedAt === null ? {} : { expectedUpdatedAt }),
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
    setAssigneeState(null);
    setDeleteOpen(false);
    setDetailReady(true);
    setDetailError(null);
    setExpectedUpdatedAt(null);
    detailRequest.current += 1;
    save.reset();
    remove.reset();
  }

  function applyIssue(issue: IssueSummary) {
    setTitle(issue.title);
    setDescription(issue.description ?? "");
    setStatusIdState(issue.statusId);
    setOmitStatusOnCreate(false);
    setPriorityState(issue.priority);
    setAssigneeState(assigneeFromIssue(issue));
    setExpectedUpdatedAt(issue.updatedAt);
    setDetailError(null);
    setDetailReady(true);
  }

  function loadDetail(issueIdToLoad: string) {
    if (options.projectId === null) {
      return;
    }

    const requestId = detailRequest.current + 1;
    detailRequest.current = requestId;
    setDetailReady(false);
    setDetailError(null);
    void getIssue(options.organizationSlug, options.projectId, issueIdToLoad)
      .then((issue) => {
        if (detailRequest.current !== requestId) {
          return;
        }

        applyIssue(issue);
      })
      .catch(() => {
        if (detailRequest.current !== requestId) {
          return;
        }

        setDetailReady(false);
        setDetailError("The issue could not be loaded.");
      });
  }

  function setAssignee(next: EligibleAssignee | null) {
    setAssigneeState(next);
  }

  return {
    assignee,
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
    detailError,
    detailReady,
    errorMessage: readIssueError(
      save.error,
      mode === "edit" ? "The issue could not be updated." : "The issue could not be created.",
    ),
    isPending: save.isPending || remove.isPending,
    isReadOnly: mode === "edit" && !options.canUpdateIssue,
    isValid: title.trim().length > 0 && (mode !== "edit" || detailReady),
    mode,
    openCreate: (nextStatusId?: string) => {
      save.reset();
      setMode("create");
      setIssueId(null);
      setTitle("");
      setDescription("");
      setPriorityState("none");
      setAssigneeState(null);
      setStatusIdState(nextStatusId ?? defaultStatusId);
      setOmitStatusOnCreate(nextStatusId === undefined);
      setDeleteOpen(false);
    },
    openEdit: (issue) => {
      save.reset();
      setMode("edit");
      setIssueId(issue.id);
      setTitle(issue.title);
      setStatusIdState(issue.statusId);
      setOmitStatusOnCreate(false);
      setPriorityState(issue.priority);
      setAssigneeState(assigneeFromIssue(issue));
      setDeleteOpen(false);

      if ("description" in issue) {
        setDescription(issue.description ?? "");
        setExpectedUpdatedAt(issue.updatedAt);
        setDetailError(null);
        setDetailReady(true);
        return;
      }

      setDescription("");
      setExpectedUpdatedAt(null);
      loadDetail(issue.id);
    },
    priority,
    requestDelete: () => {
      setDeleteOpen(true);
    },
    reset,
    retryDetail: () => {
      if (issueId !== null) {
        loadDetail(issueId);
      }
    },
    setAssignee,
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
        (mode === "edit" && (!detailReady || !options.canUpdateIssue))
      ) {
        return;
      }

      save.mutate();
    },
    title,
  };
}

function assigneeFromIssue(issue: IssueCardSummary | IssueSummary): EligibleAssignee | null {
  if (issue.assigneeMemberId === null || issue.assignee === null) {
    return null;
  }

  return {
    email: issue.assignee.email,
    id: issue.assigneeMemberId,
    image: issue.assignee.image,
    name: issue.assignee.name,
  };
}

export { UNASSIGNED, useIssueForm, type IssueFormState };
