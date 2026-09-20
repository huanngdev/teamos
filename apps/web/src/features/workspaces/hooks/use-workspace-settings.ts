import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  canDeleteOrganization,
  canUpdateOrganization,
  type OrganizationContext,
  type OrganizationSummary,
} from "@teamos/shared";

import { notify } from "@/shared";
import { ApiClientError } from "@/shared/api/api-client";
import { deleteOrganization, updateOrganization } from "../api/organization-api";
import { resolveWorkspaceDestination } from "../lib/resolve-workspace-destination";
import { workspaceProjectsPath, workspacesNewPath } from "../lib/workspace-paths";
import { ORGANIZATIONS_QUERY_KEY, workspaceKeys } from "../query-keys";

interface WorkspaceSettingsView {
  canDelete: boolean;
  canRename: boolean;
  deleteConfirmation: string;
  deleteDialogOpen: boolean;
  deleteErrorMessage: string | null;
  draftName: string;
  hasNameChanges: boolean;
  isDeleteConfirmed: boolean;
  isDeleting: boolean;
  isRenaming: boolean;
  memberCount: number;
  renameErrorMessage: string | null;
  slug: string;
  workspaceName: string;
  onConfirmDelete: () => void;
  onDeleteConfirmationChange: (value: string) => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onSave: () => void;
}

function readRenameErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "FORBIDDEN") {
      return "You are not allowed to rename this workspace.";
    }

    if (error.code === "ORGANIZATION_NOT_FOUND") {
      return "This workspace no longer exists.";
    }

    if (error.code === "VALIDATION_ERROR") {
      return "Enter a workspace name between 1 and 80 characters.";
    }

    if (error.kind === "network" || error.kind === "timeout") {
      return "The workspace could not be renamed. Check your connection.";
    }
  }

  return "The workspace could not be renamed.";
}

function readDeleteErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "FORBIDDEN") {
      return "You are not allowed to delete this workspace.";
    }

    if (error.code === "ORGANIZATION_NOT_FOUND") {
      return "This workspace no longer exists.";
    }

    if (error.code === "VALIDATION_ERROR") {
      return "Type the workspace name exactly to confirm deletion.";
    }

    if (error.kind === "network" || error.kind === "timeout") {
      return "The workspace could not be deleted. Check your connection.";
    }
  }

  return "The workspace could not be deleted.";
}

/*
 * View model for the workspace settings screen. Rename and deletion go through
 * the TeamOS facade, and the hook owns cache reconciliation, error copy, and
 * post-delete navigation so the panel and danger zone stay presentational.
 */
function useWorkspaceSettings(organization: OrganizationContext): WorkspaceSettingsView {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draftName, setDraftName] = useState(organization.name);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canRename = canUpdateOrganization(organization.role);
  const canDelete = canDeleteOrganization(organization.role);
  const trimmedName = draftName.trim();
  const hasNameChanges = canRename && trimmedName.length > 0 && trimmedName !== organization.name;

  const renameMutation = useMutation({
    mutationFn: (name: string) => updateOrganization(organization.slug, { name }),
    onError: (error) => {
      const message = readRenameErrorMessage(error);

      setRenameError(message);
      notify.error(message);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(workspaceKeys(organization.slug).detail(), updated);
      queryClient.setQueryData<OrganizationSummary[]>(ORGANIZATIONS_QUERY_KEY, (current) =>
        current === undefined
          ? current
          : current.map((item) =>
              item.id === updated.id ? { ...item, name: updated.name } : item,
            ),
      );
      setRenameError(null);
      setDraftName(updated.name);
      notify.success("Workspace renamed");
      void queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (confirmationName: string) =>
      deleteOrganization(organization.slug, { confirmationName }),
    onError: (error) => {
      const message = readDeleteErrorMessage(error);

      setDeleteError(message);
      notify.error(message);
    },
    onSuccess: () => {
      /*
       * The organization-prefixed cache covers the workspace detail, members,
       * invitations, and projects. Removing it before navigating avoids a
       * refetch of a workspace that no longer exists.
       */
      const remaining = (
        queryClient.getQueryData<OrganizationSummary[]>(ORGANIZATIONS_QUERY_KEY) ?? []
      ).filter((item) => item.id !== organization.id);

      queryClient.setQueryData<OrganizationSummary[]>(ORGANIZATIONS_QUERY_KEY, remaining);
      queryClient.removeQueries({ queryKey: workspaceKeys(organization.slug).detail() });
      setDeleteDialogOpen(false);
      notify.success("Workspace deleted");

      const destination = resolveWorkspaceDestination(remaining, null);

      void navigate(
        destination.kind === "create"
          ? workspacesNewPath()
          : workspaceProjectsPath(destination.slug),
        { replace: true },
      );
      void queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
    },
  });

  return {
    canDelete,
    canRename,
    deleteConfirmation,
    deleteDialogOpen,
    deleteErrorMessage: deleteError,
    draftName,
    hasNameChanges,
    isDeleteConfirmed: deleteConfirmation === organization.name,
    isDeleting: deleteMutation.isPending,
    isRenaming: renameMutation.isPending,
    memberCount: organization.memberCount,
    onConfirmDelete: () => {
      if (deleteMutation.isPending) {
        return;
      }

      deleteMutation.mutate(deleteConfirmation);
    },
    onDeleteConfirmationChange: (value) => {
      setDeleteConfirmation(value);
      setDeleteError(null);
    },
    onDeleteDialogOpenChange: (open) => {
      if (deleteMutation.isPending) {
        return;
      }

      setDeleteDialogOpen(open);

      if (open) {
        setDeleteConfirmation("");
        setDeleteError(null);
      }
    },
    onNameChange: (value) => {
      setDraftName(value);
      setRenameError(null);
    },
    onSave: () => {
      if (renameMutation.isPending || deleteMutation.isPending || !hasNameChanges) {
        return;
      }

      renameMutation.mutate(trimmedName);
    },
    renameErrorMessage: renameError,
    slug: organization.slug,
    workspaceName: organization.name,
  };
}

export { useWorkspaceSettings, type WorkspaceSettingsView };
