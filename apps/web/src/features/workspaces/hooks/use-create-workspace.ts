import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { slugify, type OrganizationSummary } from "@teamos/shared";

import { readAuthClientError, authClient } from "@/features/auth";
import { ORGANIZATIONS_QUERY_KEY } from "../query-keys";
import { workspaceProjectsPath } from "../lib/workspace-paths";

const MAX_SLUG_ATTEMPTS = 5;
const FALLBACK_SLUG = "workspace";

/*
 * Better Auth reports a taken slug as an API error on `checkSlug`, not as a
 * falsy `status`. Any other error is surfaced to the user.
 */
const SLUG_TAKEN_ERROR_CODES = new Set([
  "ORGANIZATION_ALREADY_EXISTS",
  "ORGANIZATION_SLUG_ALREADY_TAKEN",
]);
const WORKSPACE_LIMIT_ERROR_CODE = "YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS";

function createSlugSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 4);
}

function getCreateErrorMessage(error: unknown): string {
  const { code, message } = readAuthClientError(error);

  if (code === WORKSPACE_LIMIT_ERROR_CODE) {
    return "You have reached the maximum number of workspaces for this account.";
  }

  return message ?? "The workspace could not be created.";
}

function useCreateWorkspace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const submitWorkspace = async (name: string): Promise<void> => {
    setErrorMessage(null);
    setIsPending(true);

    try {
      const baseSlug = slugify(name) || FALLBACK_SLUG;
      let slug = baseSlug;

      for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
        const availability = await authClient.organization.checkSlug({ slug });

        if (availability.data?.status === true) {
          break;
        }

        const { code, message } = readAuthClientError(availability.error);

        if (code === undefined || !SLUG_TAKEN_ERROR_CODES.has(code)) {
          setErrorMessage(message ?? "The workspace address is unavailable.");
          return;
        }

        slug = `${baseSlug}-${createSlugSuffix()}`;
      }

      const { data, error } = await authClient.organization.create({ name: name.trim(), slug });

      if (error !== null || data === null) {
        setErrorMessage(getCreateErrorMessage(error));
        return;
      }

      const created: OrganizationSummary = {
        createdAt: new Date(data.createdAt).toISOString(),
        id: data.id,
        logo: data.logo ?? null,
        name: data.name,
        slug: data.slug,
      };

      queryClient.setQueryData<OrganizationSummary[]>(ORGANIZATIONS_QUERY_KEY, (current) =>
        current?.some((organization) => organization.id === created.id) === true
          ? current
          : [...(current ?? []), created],
      );
      await queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });

      void navigate(workspaceProjectsPath(created.slug), { replace: true });
    } catch {
      setErrorMessage("The workspace could not be created.");
    } finally {
      setIsPending(false);
    }
  };

  return { errorMessage, isPending, submitWorkspace };
}

export { useCreateWorkspace };
