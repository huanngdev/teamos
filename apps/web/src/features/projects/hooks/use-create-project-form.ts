import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { slugify, type ProjectSummary, type ProjectVisibility } from "@teamos/shared";

import { ApiClientError } from "@/shared/api/api-client";
import { notify } from "@/shared";
import { createProject } from "../api/project-api";
import { projectKeys } from "../query-keys";

interface CreateProjectFormState {
  errorMessage: string | null;
  isPending: boolean;
  isValid: boolean;
  name: string;
  reset: () => void;
  setName: (value: string) => void;
  setVisibility: (value: ProjectVisibility) => void;
  submit: () => void;
  visibility: ProjectVisibility;
}

interface UseCreateProjectFormOptions {
  onCreated: (project: ProjectSummary) => void | Promise<void>;
  organizationSlug: string;
}

function useCreateProjectForm(options: UseCreateProjectFormOptions): CreateProjectFormState {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<ProjectVisibility>("workspace");

  const mutation = useMutation({
    mutationFn: (request: { name: string; slug: string; visibility: ProjectVisibility }) =>
      createProject(options.organizationSlug, request),
    onError: (error) => {
      notify.error(readCreateProjectError(error) ?? "The project could not be created.");
    },
  });

  const slug = slugify(name);

  return {
    errorMessage: readCreateProjectError(mutation.error),
    isPending: mutation.isPending,
    isValid: name.trim().length > 0 && slug.length > 0,
    name,
    reset: () => {
      setName("");
      setVisibility("workspace");
      mutation.reset();
    },
    setName: (value: string) => {
      setName(value);
    },
    setVisibility,
    submit: () => {
      if (mutation.isPending || !name.trim() || slug.length === 0) {
        return;
      }

      mutation.mutate(
        { name: name.trim(), slug, visibility },
        {
          onSuccess: async (project) => {
            /*
             * Prefix invalidation so every filtered project list refreshes, not
             * just the unfiltered one.
             */
            await queryClient.invalidateQueries({
              queryKey: projectKeys(options.organizationSlug).listPrefix(),
            });
            notify.success("Project created");
            setName("");
            setVisibility("workspace");
            await options.onCreated(project);
          },
        },
      );
    },
    visibility,
  };
}

function readCreateProjectError(error: unknown): string | null {
  if (error === null || error === undefined) {
    return null;
  }

  if (error instanceof ApiClientError && error.code === "PROJECT_SLUG_ALREADY_TAKEN") {
    return "That project name is already used in this workspace. Try a different name.";
  }

  if (error instanceof ApiClientError && error.code === "FORBIDDEN") {
    return "You are not allowed to create a project in this workspace.";
  }

  return "The project could not be created.";
}

export { useCreateProjectForm, type CreateProjectFormState };
