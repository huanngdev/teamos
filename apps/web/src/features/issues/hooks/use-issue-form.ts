import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  issuePrioritySchema,
  type EligibleAssignee,
  type IssueCardSummary,
  type IssueDetail,
  type IssuePriority,
  type ProjectStatusSummary,
} from "@teamos/shared";

import { notify } from "@/shared";
import { createIssue, updateIssue } from "../api/issue-api";
import { assigneesFromIssue, issueAssigneeKey } from "../lib/issue-assignees";
import { readIssueError } from "../lib/issue-errors";
import { issueKeys } from "../query-keys";

interface IssueFormBaseline {
  assigneeKey: string;
  priority: IssuePriority;
  statusId: string;
  title: string;
}

interface IssueFormState {
  errorMessage: string | null;
  isDirty: boolean;
  isPending: boolean;
  isReadOnly: boolean;
  isValid: boolean;
  mode: "closed" | "create" | "edit";
  priority: IssuePriority;
  requestClose: () => void;
  selectedAssignees: readonly EligibleAssignee[];
  setAssignees: (assignees: EligibleAssignee[]) => void;
  setPriority: (value: string | null) => void;
  setStatusId: (value: string | null) => void;
  setTitle: (value: string) => void;
  statusId: string;
  submit: () => void;
  title: string;
  titleError: string | null;
}

interface UseIssueFormOptions {
  canUpdateIssue: boolean;
  onCreated?: (issue: IssueDetail) => void;
  organizationSlug: string;
  projectId: string | null;
  statuses: readonly ProjectStatusSummary[];
}

function useIssueForm(options: UseIssueFormOptions): IssueFormState & {
  openCreate: (statusId?: string) => void;
  openEdit: (issue: IssueCardSummary) => void;
} {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"closed" | "create" | "edit">("closed");
  const [issueId, setIssueId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [statusId, setStatusIdState] = useState("");
  const [omitStatusOnCreate, setOmitStatusOnCreate] = useState(false);
  const [priority, setPriorityState] = useState<IssuePriority>("none");
  const [selectedAssignees, setAssignees] = useState<EligibleAssignee[]>([]);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const baseline = useRef<IssueFormBaseline>({
    assigneeKey: "",
    priority: "none",
    statusId: "",
    title: "",
  });
  const createdHandler = useRef(options.onCreated);
  const modeRef = useRef(mode);
  createdHandler.current = options.onCreated;
  modeRef.current = mode;
  const trimmedTitle = title.trim();
  const isDirty =
    title !== baseline.current.title ||
    priority !== baseline.current.priority ||
    statusId !== baseline.current.statusId ||
    issueAssigneeKey(selectedAssignees.map((person) => person.id)) !== baseline.current.assigneeKey;

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

      const assigneeMemberIds = selectedAssignees.map((person) => person.id);
      const request = {
        assigneeMemberIds,
        priority,
        title: trimmedTitle,
        ...(omitStatusOnCreate || statusId.length === 0 ? {} : { statusId }),
      };

      if (mode === "edit" && issueId !== null) {
        return updateIssue(options.organizationSlug, options.projectId, issueId, {
          assigneeMemberIds,
          expectedUpdatedAt: expectedUpdatedAt ?? undefined,
          priority,
          statusId,
          title: trimmedTitle,
        });
      }

      return createIssue(options.organizationSlug, options.projectId, request);
    },
    onSuccess: async (saved) => {
      await invalidate();
      const created = modeRef.current === "create";
      const handleCreated = createdHandler.current;
      reset();

      if (created && handleCreated !== undefined) {
        handleCreated(saved);
        return;
      }

      notify.success(created ? "Issue created" : "Issue updated");
    },
  });

  function remember(next: IssueFormBaseline) {
    baseline.current = next;
  }

  function reset() {
    setMode("closed");
    setIssueId(null);
    setTitle("");
    setStatusIdState("");
    setOmitStatusOnCreate(false);
    setPriorityState("none");
    setAssignees([]);
    setExpectedUpdatedAt(null);
    setTitleError(null);
    remember({ assigneeKey: "", priority: "none", statusId: "", title: "" });
    save.reset();
  }

  function requestClose() {
    if (save.isPending) {
      return;
    }

    reset();
  }

  function submit() {
    if (save.isPending || (mode === "edit" && !options.canUpdateIssue)) {
      return;
    }

    if (trimmedTitle.length === 0) {
      setTitleError("Enter an issue title.");
      return;
    }

    if (trimmedTitle.length > 140) {
      setTitleError("Use 140 characters or fewer.");
      return;
    }

    setTitleError(null);
    save.mutate();
  }

  return {
    errorMessage: readIssueError(
      save.error,
      mode === "edit" ? "The issue could not be updated." : "The issue could not be created.",
    ),
    isDirty,
    isPending: save.isPending,
    isReadOnly: mode === "edit" && !options.canUpdateIssue,
    isValid: trimmedTitle.length > 0 && trimmedTitle.length <= 140,
    mode,
    openCreate: (nextStatusId?: string) => {
      const nextStatus = nextStatusId ?? "";
      save.reset();
      setMode("create");
      setIssueId(null);
      setTitle("");
      setPriorityState("none");
      setAssignees([]);
      setStatusIdState(nextStatus);
      setOmitStatusOnCreate(nextStatusId === undefined);
      setExpectedUpdatedAt(null);
      setTitleError(null);
      remember({ assigneeKey: "", priority: "none", statusId: nextStatus, title: "" });
    },
    openEdit: (issue) => {
      const nextAssignees = assigneesFromIssue(issue);
      save.reset();
      setMode("edit");
      setIssueId(issue.id);
      setTitle(issue.title);
      setStatusIdState(issue.statusId);
      setOmitStatusOnCreate(false);
      setPriorityState(issue.priority);
      setAssignees(nextAssignees);
      setExpectedUpdatedAt(issue.updatedAt);
      setTitleError(null);
      remember({
        assigneeKey: issueAssigneeKey(nextAssignees.map((person) => person.id)),
        priority: issue.priority,
        statusId: issue.statusId,
        title: issue.title,
      });
    },
    priority,
    requestClose,
    selectedAssignees,
    setAssignees,
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
    setTitle: (value) => {
      setTitle(value);
      setTitleError(null);
    },
    statusId,
    submit,
    title,
    titleError,
  };
}

export { useIssueForm, type IssueFormState };
