import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { notify } from "@/shared";
import { deleteIssues } from "../api/issue-api";
import { readIssueError } from "../lib/issue-errors";
import { issueKeys } from "../query-keys";

interface UseDeleteSelectedIssuesOptions {
  canDelete: boolean;
  onDeleted: () => void;
  organizationSlug: string;
  projectId: string | null;
}

function useDeleteSelectedIssues(options: UseDeleteSelectedIssuesOptions) {
  const queryClient = useQueryClient();
  const onDeleted = useRef(options.onDeleted);
  const [open, setOpen] = useState(false);
  const [issueIds, setIssueIds] = useState<string[]>([]);
  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      const projectId = options.projectId;

      if (projectId === null) {
        throw new Error("Project is not ready.");
      }

      await deleteIssues(options.organizationSlug, projectId, { issueIds: ids });
    },
    onSuccess: async (_result, ids) => {
      const projectId = options.projectId;

      if (projectId !== null) {
        await queryClient.invalidateQueries({
          queryKey: issueKeys(options.organizationSlug, projectId).prefix(),
        });
      }

      notify.success(ids.length === 1 ? "Issue deleted" : "Issues deleted");
      setOpen(false);
      setIssueIds([]);
      onDeleted.current();
    },
  });

  onDeleted.current = options.onDeleted;

  return {
    cancel: () => {
      if (!remove.isPending) {
        setOpen(false);
      }
    },
    confirm: () => {
      if (issueIds.length === 0 || remove.isPending) {
        return;
      }

      remove.mutate(issueIds);
    },
    count: issueIds.length,
    error: readIssueError(remove.error, "The issues could not be deleted."),
    isPending: remove.isPending,
    open,
    request: (issueIds: readonly string[]) => {
      if (!options.canDelete || options.projectId === null || issueIds.length === 0) {
        return;
      }

      remove.reset();
      setIssueIds([...issueIds]);
      setOpen(true);
    },
  };
}

export { useDeleteSelectedIssues, type UseDeleteSelectedIssuesOptions };
