import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  canPerformProjectAction,
  parseIssueCode,
  type EligibleAssignee,
  type IssueContentDocument,
  type IssueDetail,
  type IssuePriority,
  type UpdateIssueRequest,
} from "@teamos/shared";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import { useEligibleAssignees, useProjectList } from "@/features/projects";
import type { EligibleAssigneePicker } from "@/features/projects";
import { notify } from "@/shared";
import { ApiClientError } from "@/shared/api/api-client";
import { useWorkspace } from "@/features/workspaces";
import { deleteIssue, getIssueByNumber, listProjectStatuses, updateIssue } from "../api/issue-api";
import { assigneesFromIssue, issueAssigneeKey, resolveAssignees } from "../lib/issue-assignees";
import { clearIssueDraft, readIssueDraft, writeIssueDraft } from "../lib/issue-draft";
import { readIssueError } from "../lib/issue-errors";
import { focusIssueTrigger, hasIssueReturn } from "../lib/issue-navigation";
import { projectIssuePath, projectIssuesPath } from "../lib/issue-paths";
import { issueKeys } from "../query-keys";

interface IssueDetailBaseline {
  assigneeKey: string;
  contentKey: string;
  priority: IssuePriority;
  statusId: string;
  title: string;
}

interface IssueDetailReady {
  assignees: EligibleAssigneePicker;
  baseUpdatedAt: string;
  canDelete: boolean;
  canUpdate: boolean;
  code: string;
  content: IssueContentDocument | null;
  contentError: string | null;
  createdAt: string;
  deleteError: string | null;
  deleteOpen: boolean;
  editorGeneration: number;
  errorMessage: string | null;
  hasReturn: boolean;
  isDirty: boolean;
  isPending: boolean;
  issuesPath: string;
  projectName: string;
  onAssignees: (assignees: EligibleAssignee[]) => void;
  selectedAssignees: readonly EligibleAssignee[];
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onContent: (content: IssueContentDocument | null, error: string | null) => void;
  onCopyLink: () => void;
  onDelete: () => void;
  onDismiss: () => void;
  onPriority: (value: string | null) => void;
  onRefresh: () => void;
  onStatus: (statusId: string | null) => void;
  onTitle: (value: string) => void;
  priority: IssuePriority;
  saveLabel: string | null;
  statusId: string;
  statuses: Awaited<ReturnType<typeof listProjectStatuses>>;
  statusesError: string | null;
  title: string;
  titleError: string | null;
  updatedAt: string;
}

type IssueDetailState =
  | { state: unknown; status: "redirect"; to: string }
  | { status: "not-found" }
  | { onDismiss: () => void; status: "loading" }
  | { message: string; onDismiss: () => void; retry: () => void; status: "error" }
  | { status: "ready"; view: IssueDetailReady };

function contentKey(content: IssueContentDocument | null): string {
  return content === null ? "" : JSON.stringify(content);
}

function draftSignature(draft: IssueDetailBaseline): string {
  return JSON.stringify({
    assigneeKey: draft.assigneeKey,
    contentKey: draft.contentKey,
    priority: draft.priority,
    statusId: draft.statusId,
    title: draft.title.trim(),
  });
}

function assigneeKey(people: readonly EligibleAssignee[]): string {
  return issueAssigneeKey(people.map((person) => person.id));
}

function useIssueDetail(): IssueDetailState {
  const { organizationSlug = "", projectSlug = "", issueCode = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const parsed = parseIssueCode(issueCode);
  const canonical = parsed?.canonical === true;
  const workspace = useWorkspace(organizationSlug);
  const projectList = useProjectList({
    enabled: workspace.status === "ready" && canonical,
    organizationSlug,
  });
  const project = projectList.projects.find((item) => item.slug === projectSlug) ?? null;
  const projectId = project?.id ?? null;
  const organizationRole = workspace.status === "ready" ? workspace.organization.role : "member";
  const detailQuery = useQuery({
    enabled: workspace.status === "ready" && canonical && projectId !== null,
    queryFn: () => getIssueByNumber(organizationSlug, projectId ?? "", parsed?.decimal ?? ""),
    queryKey: issueKeys(organizationSlug, projectId ?? "").byNumber(parsed?.decimal ?? ""),
  });
  const statuses = useQuery({
    enabled: workspace.status === "ready" && canonical && projectId !== null,
    queryFn: () => listProjectStatuses(organizationSlug, projectId ?? ""),
    queryKey: issueKeys(organizationSlug, projectId ?? "").statuses(),
  });
  const assignees = useEligibleAssignees({
    enabled: workspace.status === "ready" && canonical,
    organizationSlug,
    projectId,
  });
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("none");
  const [statusId, setStatusId] = useState("");
  const [selectedAssignees, setAssignees] = useState<EligibleAssignee[]>([]);
  const [content, setContent] = useState<IssueContentDocument | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState("");
  const [displayUpdatedAt, setDisplayUpdatedAt] = useState("");
  const [editorGeneration, setEditorGeneration] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const baseline = useRef<IssueDetailBaseline>({
    assigneeKey: "",
    contentKey: "",
    priority: "none",
    statusId: "",
    title: "",
  });
  const applied = useRef<string | null>(null);
  const failedSave = useRef<string | null>(null);
  const sentSave = useRef<IssueDetailBaseline | null>(null);
  const draftRef = useRef<IssueDetailBaseline>({
    assigneeKey: "",
    contentKey: "",
    priority: "none",
    statusId: "",
    title: "",
  });
  const selectedRef = useRef(selectedAssignees);
  const issue = detailQuery.data;
  const isDirty =
    title !== baseline.current.title ||
    priority !== baseline.current.priority ||
    statusId !== baseline.current.statusId ||
    assigneeKey(selectedAssignees) !== baseline.current.assigneeKey ||
    contentKey(content) !== baseline.current.contentKey ||
    contentError !== null;
  const dirtyRef = useRef(isDirty);
  const code = parsed?.code ?? "";
  dirtyRef.current = isDirty;
  const issuesPath = projectIssuesPath(organizationSlug, projectSlug);
  const canUpdate =
    project !== null &&
    canPerformProjectAction("update-issue", {
      organizationRole,
      projectRole: project.role,
      visibility: project.visibility,
    });
  const canDelete =
    project !== null &&
    canPerformProjectAction("delete-issue", {
      organizationRole,
      projectRole: project.role,
      visibility: project.visibility,
    });

  selectedRef.current = selectedAssignees;
  draftRef.current = {
    assigneeKey: assigneeKey(selectedAssignees),
    contentKey: contentKey(content),
    priority,
    statusId,
    title,
  };
  const save = useMutation({
    mutationFn: async (payload: UpdateIssueRequest) => {
      if (projectId === null || issue === undefined) {
        throw new Error("Issue is not ready.");
      }

      return updateIssue(organizationSlug, projectId, issue.id, payload);
    },
    onError: (error) => {
      failedSave.current = draftSignature(draftRef.current);

      if (error instanceof ApiClientError && error.code === "ISSUE_REVISION_CONFLICT") {
        setConflict(true);
      }
    },
    onSuccess: async (saved) => {
      const sent = sentSave.current;
      const current = draftRef.current;
      const nextAssignees = assigneesFromIssue(saved);
      const same =
        sent !== null &&
        current.title.trim() === sent.title &&
        current.priority === sent.priority &&
        current.statusId === sent.statusId &&
        current.assigneeKey === sent.assigneeKey &&
        current.contentKey === sent.contentKey;

      clearIssueDraft(saved.id);
      failedSave.current = null;
      setBaseUpdatedAt(saved.updatedAt);
      setDisplayUpdatedAt(saved.updatedAt);
      setConflict(false);
      setTitleError(null);
      baseline.current = {
        assigneeKey: assigneeKey(nextAssignees),
        contentKey: contentKey(saved.content),
        priority: saved.priority,
        statusId: saved.statusId,
        title: saved.title,
      };

      if (same) {
        setTitle(saved.title);
        setPriority(saved.priority);
        setStatusId(saved.statusId);
        setAssignees(nextAssignees);
        setContent(saved.content);
        setContentError(null);
      }

      applied.current = `${saved.id}:${saved.updatedAt}`;
      await queryClient.invalidateQueries({
        queryKey: issueKeys(organizationSlug, projectId ?? "").prefix(),
      });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (projectId === null || issue === undefined) {
        throw new Error("Issue is not ready.");
      }

      await deleteIssue(organizationSlug, projectId, issue.id);
    },
    onSuccess: async () => {
      if (issue !== undefined) {
        clearIssueDraft(issue.id);
      }

      await queryClient.invalidateQueries({
        queryKey: issueKeys(organizationSlug, projectId ?? "").prefix(),
      });
      notify.success("Issue deleted");
      void navigate(issuesPath);
    },
  });

  useEffect(() => {
    applied.current = null;
  }, [parsed?.decimal]);

  useEffect(() => {
    if (issue === undefined) {
      return;
    }

    const key = `${issue.id}:${issue.updatedAt}`;

    if (applied.current === key) {
      if (dirtyRef.current && issue.updatedAt !== baseUpdatedAt) {
        setConflict(true);
      }

      const stored = readIssueDraft(issue.id);
      const ids =
        stored !== null && stored.baseUpdatedAt === baseUpdatedAt
          ? stored.assigneeMemberIds
          : selectedRef.current.map((person) => person.id);

      if (issueAssigneeKey(ids) !== assigneeKey(selectedRef.current)) {
        return;
      }

      const resolved = resolveAssignees(ids, assignees.assignees, assigneesFromIssue(issue));
      const changed = resolved.some((person, index) => {
        const current = selectedRef.current[index];

        return (
          current === undefined || current.name !== person.name || current.email !== person.email
        );
      });

      if (changed) {
        setAssignees(resolved);
      }

      return;
    }

    if (dirtyRef.current && applied.current !== null) {
      if (issue.updatedAt !== baseUpdatedAt) {
        setConflict(true);
      }

      return;
    }

    const draft = readIssueDraft(issue.id);
    const serverAssignees = assigneesFromIssue(issue);
    baseline.current = {
      assigneeKey: assigneeKey(serverAssignees),
      contentKey: contentKey(issue.content),
      priority: issue.priority,
      statusId: issue.statusId,
      title: issue.title,
    };

    if (draft === null) {
      setTitle(issue.title);
      setPriority(issue.priority);
      setStatusId(issue.statusId);
      setAssignees(serverAssignees);
      setContent(issue.content);
      setBaseUpdatedAt(issue.updatedAt);
      setConflict(false);
    } else {
      setTitle(draft.title);
      setPriority(draft.priority);
      setStatusId(draft.statusId);
      setAssignees(resolveAssignees(draft.assigneeMemberIds, assignees.assignees, serverAssignees));
      setContent(draft.content);
      setBaseUpdatedAt(draft.baseUpdatedAt);
      setConflict(draft.baseUpdatedAt !== issue.updatedAt);
    }

    setContentError(null);
    setDisplayUpdatedAt(issue.updatedAt);
    setEditorGeneration((current) => current + 1);
    applied.current = key;
  }, [assignees.assignees, baseUpdatedAt, issue]);

  useEffect(() => {
    if (issue === undefined || baseUpdatedAt.length === 0) {
      return;
    }

    if (!isDirty) {
      clearIssueDraft(issue.id);
      return;
    }

    writeIssueDraft(issue.id, {
      assigneeMemberIds: selectedAssignees.map((person) => person.id),
      baseUpdatedAt,
      content,
      priority,
      statusId,
      title,
    });
  }, [baseUpdatedAt, content, isDirty, issue, priority, selectedAssignees, statusId, title]);

  useEffect(() => {
    if (!canUpdate || !isDirty || contentError !== null || conflict || save.isPending) {
      return;
    }

    const signature = draftSignature(draftRef.current);

    if (save.isError && failedSave.current === signature) {
      return;
    }

    const trimmed = title.trim();
    const handle = window.setTimeout(() => {
      if (trimmed.length === 0) {
        setTitleError("Enter an issue title.");
        return;
      }

      if (trimmed.length > 140) {
        setTitleError("Use 140 characters or fewer.");
        return;
      }

      const assigneeMemberIds = selectedAssignees.map((person) => person.id);
      const payload: UpdateIssueRequest = {
        assigneeMemberIds,
        content,
        expectedUpdatedAt: baseUpdatedAt,
        priority,
        statusId,
        title: trimmed,
      };

      sentSave.current = {
        assigneeKey: issueAssigneeKey(assigneeMemberIds),
        contentKey: contentKey(payload.content ?? null),
        priority,
        statusId,
        title: trimmed,
      };
      setTitleError(null);
      save.mutate(payload);
    }, 300);

    return () => {
      window.clearTimeout(handle);
    };
  }, [
    baseUpdatedAt,
    canUpdate,
    conflict,
    content,
    contentError,
    isDirty,
    priority,
    save.isError,
    save.isPending,
    save.mutate,
    selectedAssignees,
    statusId,
    title,
  ]);

  function dismiss() {
    if (hasIssueReturn(location.state)) {
      focusIssueTrigger(code);
      void navigate(-1);
      window.setTimeout(() => {
        focusIssueTrigger(code);
      }, 0);
      return;
    }

    void navigate(issuesPath);
  }

  function applyServerIssue(next: IssueDetail) {
    const serverAssignees = assigneesFromIssue(next);

    baseline.current = {
      assigneeKey: assigneeKey(serverAssignees),
      contentKey: contentKey(next.content),
      priority: next.priority,
      statusId: next.statusId,
      title: next.title,
    };
    setTitle(next.title);
    setPriority(next.priority);
    setStatusId(next.statusId);
    setAssignees(serverAssignees);
    setContent(next.content);
    setContentError(null);
    setBaseUpdatedAt(next.updatedAt);
    setDisplayUpdatedAt(next.updatedAt);
    setConflict(false);
    setTitleError(null);
    setEditorGeneration((current) => current + 1);
    applied.current = `${next.id}:${next.updatedAt}`;
  }

  function refresh() {
    if (issue !== undefined) {
      clearIssueDraft(issue.id);
      applyServerIssue(issue);
    }

    dirtyRef.current = false;
    void detailQuery.refetch();
  }

  if (parsed !== undefined && !parsed.canonical) {
    return {
      state: location.state,
      status: "redirect",
      to: projectIssuePath(organizationSlug, projectSlug, parsed.code),
    };
  }

  if (parsed === undefined) {
    return { status: "not-found" };
  }

  const pendingShell =
    workspace.status === "loading" ||
    (workspace.status === "ready" &&
      (projectList.isPending || (project === null && projectList.isFetching)));

  if (workspace.status === "error") {
    return {
      message: workspace.message,
      onDismiss: dismiss,
      retry: () => undefined,
      status: "error",
    };
  }

  if (workspace.status === "not-found") {
    return { status: "not-found" };
  }

  if (pendingShell || workspace.status !== "ready") {
    return { onDismiss: dismiss, status: "loading" };
  }

  if (projectList.errorMessage !== null && project === null) {
    return {
      message: projectList.errorMessage,
      onDismiss: dismiss,
      retry: projectList.retry,
      status: "error",
    };
  }

  if (
    project === null ||
    (detailQuery.data === undefined && !detailQuery.isPending && !detailQuery.isError)
  ) {
    return { status: "not-found" };
  }

  if (detailQuery.isError && detailQuery.data === undefined) {
    if (isMissingIssue(detailQuery.error)) {
      return { status: "not-found" };
    }

    return {
      message: "The issue could not be loaded.",
      onDismiss: dismiss,
      retry: () => {
        void detailQuery.refetch();
      },
      status: "error",
    };
  }

  if (detailQuery.isPending || applied.current === null || detailQuery.data === undefined) {
    return { onDismiss: dismiss, status: "loading" };
  }

  const loaded = detailQuery.data;
  const saveLabel = save.isPending
    ? "Saving"
    : conflict
      ? "This issue changed somewhere else. Refresh to see it, or save again to check."
      : save.isError
        ? (readIssueError(save.error, "The issue could not be saved.") ??
          "The issue could not be saved.")
        : save.isSuccess && !isDirty
          ? "Saved"
          : null;

  return {
    status: "ready",
    view: {
      assignees,
      baseUpdatedAt,
      canDelete,
      canUpdate,
      code: parsed.code,
      content,
      contentError,
      createdAt: loaded.createdAt,
      deleteError: readIssueError(remove.error, "The issue could not be deleted."),
      deleteOpen,
      editorGeneration,
      errorMessage: saveLabel !== null && save.isError && !conflict ? saveLabel : null,
      hasReturn: hasIssueReturn(location.state),
      isDirty,
      isPending: save.isPending || remove.isPending,
      issuesPath,
      projectName: project.name,
      onAssignees: setAssignees,
      onCancelDelete: () => {
        setDeleteOpen(false);
      },
      onConfirmDelete: () => {
        remove.mutate();
      },
      onContent: (next, error) => {
        if (error === null) {
          setContent(next);
        }

        setContentError(error);
      },
      onCopyLink: () => {
        const url = new URL(
          projectIssuePath(organizationSlug, projectSlug, parsed.code),
          window.location.origin,
        ).href;

        void copyIssueLink(url);
      },
      onDelete: () => {
        setDeleteOpen(true);
      },
      onDismiss: dismiss,
      onPriority: (value) => {
        if (
          value === "none" ||
          value === "low" ||
          value === "medium" ||
          value === "high" ||
          value === "urgent"
        ) {
          setPriority(value);
        }
      },
      onRefresh: refresh,
      onStatus: (next) => {
        if (next !== null) {
          setStatusId(next);
        }
      },
      onTitle: (value) => {
        setTitle(value);
        setTitleError(null);
      },
      priority,
      saveLabel,
      selectedAssignees,
      statusId,
      statuses: statuses.data ?? [],
      statusesError: statuses.isError ? "Columns could not be loaded." : null,
      title,
      titleError,
      updatedAt: displayUpdatedAt.length > 0 ? displayUpdatedAt : loaded.updatedAt,
    },
  };
}

function isMissingIssue(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.status === 404 || error.code === "ISSUE_NOT_FOUND" || error.code === "PROJECT_NOT_FOUND")
  );
}

async function copyIssueLink(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    notify.success("Link copied");
  } catch {
    notify.error("The link could not be copied.");
  }
}

export { useIssueDetail, type IssueDetailState };
