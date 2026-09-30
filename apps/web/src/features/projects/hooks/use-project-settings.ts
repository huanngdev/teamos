import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  canPerformProjectAction,
  type OrganizationRole,
  type ProjectSummary,
  type ProjectVisibility,
  type UpdateProjectRequest,
} from "@teamos/shared";

import { issueKeys } from "@/features/issues/query-keys";
import { notify, useShellStore } from "@/shared";
import { ApiClientError } from "@/shared/api/api-client";
import { workspaceProjectsPath } from "@/features/workspaces";
import { deleteProject, updateProject } from "../api/project-api";
import { projectOverviewPath } from "../lib/project-paths";
import { projectKeys } from "../query-keys";
import { useProjectList } from "./use-project-list";

interface UseProjectSettingsOptions {
  enabled: boolean;
  organizationRole: OrganizationRole;
  organizationSlug: string;
  projectSlug: string;
}

type ProjectSettingsState =
  | { status: "loading" }
  | { projectsPath: string; status: "not-found" }
  | { message: string; retry: () => void; status: "error" }
  | { status: "redirect"; to: string }
  | {
      organizationRole: OrganizationRole;
      project: ProjectSummary;
      status: "ready";
    };

interface UseProjectSettingsFormOptions {
  organizationRole: OrganizationRole;
  organizationSlug: string;
  project: ProjectSummary;
}

interface ProjectSettingsView {
  canDelete: boolean;
  deleteConfirmation: string;
  deleteDialogOpen: boolean;
  deleteErrorMessage: string | null;
  description: string;
  hasChanges: boolean;
  isDeleteConfirmed: boolean;
  isDeleting: boolean;
  isSaving: boolean;
  name: string;
  projectName: string;
  saveErrorMessage: string | null;
  slug: string;
  visibility: ProjectVisibility;
  onConfirmDelete: () => void;
  onDeleteConfirmationChange: (value: string) => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSave: () => void;
  onVisibilityChange: (visibility: ProjectVisibility) => void;
}

/*
 * The project list is the only project read. A missing slug is not found,
 * including a private project the caller cannot see.
 */
function useProjectSettings(options: UseProjectSettingsOptions): ProjectSettingsState {
  const list = useProjectList({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
  });
  const project = list.projects.find((item) => item.slug === options.projectSlug) ?? null;
  const projectsPath = workspaceProjectsPath(options.organizationSlug);

  if (!options.enabled || list.isPending) {
    return { status: "loading" };
  }

  if (list.errorMessage !== null) {
    return {
      message: "The project could not be loaded.",
      retry: list.retry,
      status: "error",
    };
  }

  if (project === null) {
    return { projectsPath, status: "not-found" };
  }

  const canUpdate = canPerformProjectAction("update", {
    organizationRole: options.organizationRole,
    projectRole: project.role,
    visibility: project.visibility,
  });

  if (!canUpdate) {
    return {
      status: "redirect",
      to: projectOverviewPath(options.organizationSlug, project.slug),
    };
  }

  return {
    organizationRole: options.organizationRole,
    project,
    status: "ready",
  };
}

function useProjectSettingsForm(options: UseProjectSettingsFormOptions): ProjectSettingsView {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const project = options.project;
  const [draftName, setDraftName] = useState(project.name);
  const [draftDescription, setDraftDescription] = useState(project.description ?? "");
  const [draftVisibility, setDraftVisibility] = useState(project.visibility);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const trimmedName = draftName.trim();
  const descriptionValue = draftDescription.trim();
  const nextDescription = descriptionValue.length === 0 ? null : descriptionValue;
  const nameChanged = trimmedName !== project.name;
  const descriptionChanged = nextDescription !== project.description;
  const visibilityChanged = draftVisibility !== project.visibility;
  const hasChanges =
    trimmedName.length > 0 && (nameChanged || descriptionChanged || visibilityChanged);
  const canDelete = canPerformProjectAction("delete", {
    organizationRole: options.organizationRole,
    projectRole: project.role,
    visibility: project.visibility,
  });

  const saveMutation = useMutation({
    mutationFn: (request: UpdateProjectRequest) =>
      updateProject(options.organizationSlug, project.id, request),
    onError: (error) => {
      const message = readSaveErrorMessage(error);

      setSaveError(message);
      notify.error(message);
    },
    onSuccess: (updated) => {
      writeProjectLists(queryClient, options.organizationSlug, (projects) =>
        projects.map((item) => (item.id === updated.id ? updated : item)),
      );
      void queryClient.invalidateQueries({
        queryKey: projectKeys(options.organizationSlug).listPrefix(),
      });
      setDraftName(updated.name);
      setDraftDescription(updated.description ?? "");
      setDraftVisibility(updated.visibility);
      setSaveError(null);
      notify.success("Project saved");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (confirmationName: string) =>
      deleteProject(options.organizationSlug, project.id, { confirmationName }),
    onError: (error) => {
      const message = readDeleteErrorMessage(error);

      setDeleteError(message);
      notify.error(message);
    },
    onSuccess: () => {
      writeProjectLists(queryClient, options.organizationSlug, (projects) =>
        projects.filter((item) => item.id !== project.id),
      );
      queryClient.removeQueries({
        queryKey: issueKeys(options.organizationSlug, project.id).prefix(),
      });
      setDeleteDialogOpen(false);
      notify.success("Project deleted");
      void navigate(workspaceProjectsPath(options.organizationSlug), { replace: true });
    },
  });

  return {
    canDelete,
    deleteConfirmation,
    deleteDialogOpen,
    deleteErrorMessage: deleteError,
    description: draftDescription,
    hasChanges,
    isDeleteConfirmed: deleteConfirmation === project.name,
    isDeleting: deleteMutation.isPending,
    isSaving: saveMutation.isPending,
    name: draftName,
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
    onDescriptionChange: (value) => {
      setDraftDescription(value);
      setSaveError(null);
    },
    onNameChange: (value) => {
      setDraftName(value);
      setSaveError(null);
    },
    onSave: () => {
      if (saveMutation.isPending || deleteMutation.isPending || !hasChanges) {
        return;
      }

      const request: UpdateProjectRequest = {
        ...(nameChanged ? { name: trimmedName } : {}),
        ...(descriptionChanged ? { description: nextDescription } : {}),
        ...(visibilityChanged ? { visibility: draftVisibility } : {}),
      };

      saveMutation.mutate(request);
    },
    onVisibilityChange: (visibility) => {
      setDraftVisibility(visibility);
      setSaveError(null);
    },
    projectName: project.name,
    saveErrorMessage: saveError,
    slug: project.slug,
    visibility: draftVisibility,
  };
}

function writeProjectLists(
  queryClient: QueryClient,
  organizationSlug: string,
  update: (projects: readonly ProjectSummary[]) => ProjectSummary[],
): void {
  const cached = useShellStore.getState().projects[organizationSlug];

  if (cached !== undefined) {
    useShellStore.getState().setProjects(organizationSlug, update(cached));
  }

  queryClient.setQueriesData<ProjectSummary[]>(
    { queryKey: projectKeys(organizationSlug).listPrefix() },
    (existing) => (existing === undefined ? existing : update(existing)),
  );
}

function readSaveErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "FORBIDDEN") {
      return "You are not allowed to change this project.";
    }

    if (error.code === "PROJECT_NOT_FOUND") {
      return "This project no longer exists.";
    }

    if (error.code === "VALIDATION_ERROR") {
      return "Check the project name, description, and visibility.";
    }

    if (error.kind === "network" || error.kind === "timeout") {
      return "The project could not be saved. Check your connection.";
    }
  }

  return "The project could not be saved.";
}

function readDeleteErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "FORBIDDEN") {
      return "You are not allowed to delete this project.";
    }

    if (error.code === "PROJECT_NOT_FOUND") {
      return "This project no longer exists.";
    }

    if (error.code === "VALIDATION_ERROR") {
      return "Type the project name exactly to confirm deletion.";
    }

    if (error.kind === "network" || error.kind === "timeout") {
      return "The project could not be deleted. Check your connection.";
    }
  }

  return "The project could not be deleted.";
}

export {
  useProjectSettings,
  useProjectSettingsForm,
  type ProjectSettingsState,
  type ProjectSettingsView,
};
