import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileNameSchema, type AuthenticatedUser } from "@teamos/shared";

import { notify } from "@/shared";
import { ApiClientError } from "@/shared/api/api-client";
import { updateCurrentUser } from "../api/authentication-api";
import { CURRENT_USER_QUERY_KEY } from "../query-keys";

interface ProfileView {
  canCancel: boolean;
  canSave: boolean;
  draftName: string;
  errorMessage: string | null;
  isSaving: boolean;
  nameError: string | null;
  onCancel: () => void;
  onNameChange: (value: string) => void;
  onSave: () => void;
  user: AuthenticatedUser;
}

function readProfileErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "VALIDATION_ERROR") {
      return "Enter a display name between 1 and 80 characters.";
    }

    if (error.code === "UNAUTHENTICATED") {
      return "Your session has expired. Sign in again.";
    }

    if (error.kind === "network" || error.kind === "timeout") {
      return "The profile could not be updated. Check your connection.";
    }
  }

  return "The profile could not be updated.";
}

/*
 * View model for the profile screen. The hook owns the draft, validation,
 * mutation, cache reconciliation, and error copy so the panel stays
 * presentational. The session is read from the TeamOS query cache, so a
 * successful update also refreshes the account menu without a reload.
 */
function useProfileForm(user: AuthenticatedUser): ProfileView {
  const queryClient = useQueryClient();
  const [draftName, setDraftName] = useState(user.name);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (name: string) => updateCurrentUser({ name }),
    onError: (error) => {
      const message = readProfileErrorMessage(error);

      setErrorMessage(message);
      notify.error(message);

      /* A 401 means the server dropped the session, so re-check it. */
      if (error instanceof ApiClientError && error.code === "UNAUTHENTICATED") {
        void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, response);
      /*
       * Member and project lists embed the user's name, so the shared
       * `organization` cache namespace is refreshed rather than only the
       * current-user key.
       */
      void queryClient.invalidateQueries({ queryKey: ["organization"] });
      setDraftName(response.user.name);
      setErrorMessage(null);
      notify.success("Profile updated");
    },
  });
  const trimmedName = draftName.trim();
  const parsedName = profileNameSchema.safeParse(draftName);
  const nameError =
    parsedName.success || draftName === user.name ? null : "Use between 1 and 80 characters.";
  const hasChanges = parsedName.success && parsedName.data !== user.name;

  return {
    canCancel: hasChanges && !mutation.isPending,
    canSave: hasChanges && !mutation.isPending,
    draftName,
    errorMessage,
    isSaving: mutation.isPending,
    nameError,
    onCancel: () => {
      setDraftName(user.name);
      setErrorMessage(null);
    },
    onNameChange: (value) => {
      setDraftName(value);
      setErrorMessage(null);
    },
    onSave: () => {
      if (!hasChanges || mutation.isPending) {
        return;
      }

      mutation.mutate(trimmedName);
    },
    user,
  };
}

export { readProfileErrorMessage, useProfileForm, type ProfileView };
