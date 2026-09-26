import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  issueStatusCategorySchema,
  type IssueStatusCategory,
  type ProjectStatusSummary,
} from "@teamos/shared";

import { notify } from "@/shared";
import { createProjectStatus, deleteProjectStatus, updateProjectStatus } from "../api/issue-api";
import { readIssueError } from "../lib/issue-errors";
import { issueKeys } from "../query-keys";

interface ColumnFormState {
  category: IssueStatusCategory;
  errorMessage: string | null;
  isPending: boolean;
  isValid: boolean;
  mode: "closed" | "create" | "rename";
  name: string;
  reset: () => void;
  setCategory: (value: string | null) => void;
  setName: (value: string) => void;
  submit: () => void;
}

interface DeleteColumnState {
  cancel: () => void;
  confirm: () => void;
  errorMessage: string | null;
  isPending: boolean;
  name: string;
  open: boolean;
}

interface UseColumnFormOptions {
  organizationSlug: string;
  projectId: string | null;
}

function useColumnForm(options: UseColumnFormOptions): {
  deleteColumn: DeleteColumnState;
  form: ColumnFormState;
  openCreate: () => void;
  openDelete: (status: ProjectStatusSummary) => void;
  openRename: (status: ProjectStatusSummary) => void;
} {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"closed" | "create" | "rename">("closed");
  const [statusId, setStatusId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategoryState] = useState<IssueStatusCategory>("unstarted");
  const [deleteTarget, setDeleteTarget] = useState<ProjectStatusSummary | null>(null);

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

      if (mode === "rename" && statusId !== null) {
        return updateProjectStatus(options.organizationSlug, options.projectId, statusId, {
          name: name.trim(),
        });
      }

      return createProjectStatus(options.organizationSlug, options.projectId, {
        category,
        name: name.trim(),
      });
    },
    onSuccess: async () => {
      await invalidate();
      notify.success(mode === "rename" ? "Column renamed" : "Column added");
      reset();
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (options.projectId === null || deleteTarget === null) {
        throw new Error("Column is not ready.");
      }

      await deleteProjectStatus(options.organizationSlug, options.projectId, deleteTarget.id);
    },
    onSuccess: async () => {
      await invalidate();
      notify.success("Column deleted");
      setDeleteTarget(null);
      remove.reset();
    },
  });

  function reset() {
    setMode("closed");
    setStatusId(null);
    setName("");
    setCategoryState("unstarted");
    save.reset();
  }

  return {
    deleteColumn: {
      cancel: () => {
        setDeleteTarget(null);
        remove.reset();
      },
      confirm: () => {
        remove.mutate();
      },
      errorMessage: readIssueError(remove.error, "The column could not be deleted."),
      isPending: remove.isPending,
      name: deleteTarget?.name ?? "",
      open: deleteTarget !== null,
    },
    form: {
      category,
      errorMessage: readIssueError(
        save.error,
        mode === "rename" ? "The column could not be renamed." : "The column could not be added.",
      ),
      isPending: save.isPending,
      isValid: name.trim().length > 0,
      mode,
      name,
      reset,
      setCategory: (value) => {
        const parsed = issueStatusCategorySchema.safeParse(value);

        if (parsed.success) {
          setCategoryState(parsed.data);
        }
      },
      setName,
      submit: () => {
        if (save.isPending || name.trim().length === 0) {
          return;
        }

        save.mutate();
      },
    },
    openCreate: () => {
      save.reset();
      setMode("create");
      setStatusId(null);
      setName("");
      setCategoryState("unstarted");
    },
    openDelete: (status) => {
      if (status.isDefault) {
        return;
      }

      remove.reset();
      setDeleteTarget(status);
    },
    openRename: (status) => {
      save.reset();
      setMode("rename");
      setStatusId(status.id);
      setName(status.name);
    },
  };
}

export { useColumnForm, type ColumnFormState, type DeleteColumnState };
