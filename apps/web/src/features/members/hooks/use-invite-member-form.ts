import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createInvitationRequestSchema, type AssignableOrganizationRole } from "@teamos/shared";

import { ApiClientError } from "@/shared/api/api-client";
import { createOrganizationInvitation } from "../api/organization-members-api";

interface InviteMemberFormState {
  email: string;
  errorMessage: string | null;
  fieldErrorMessage: string | null;
  isPending: boolean;
  isValid: boolean;
  reset: () => void;
  role: AssignableOrganizationRole;
  setEmail: (value: string) => void;
  setRole: (value: AssignableOrganizationRole) => void;
  submit: () => void;
}

interface UseInviteMemberFormOptions {
  canAssignAdmin: boolean;
  onInvited: () => void | Promise<void>;
  organizationSlug: string;
}

function useInviteMemberForm(options: UseInviteMemberFormOptions): InviteMemberFormState {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableOrganizationRole>("member");
  const [fieldErrorMessage, setFieldErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (request: { email: string; role: AssignableOrganizationRole }) =>
      createOrganizationInvitation(options.organizationSlug, request),
  });

  const trimmedEmail = email.trim();
  const isValid = trimmedEmail.length > 0;

  async function submit(): Promise<void> {
    if (mutation.isPending) {
      return;
    }

    const parsed = createInvitationRequestSchema.safeParse({ email: trimmedEmail, role });

    if (!parsed.success) {
      setFieldErrorMessage("Enter a valid email address.");
      return;
    }

    setFieldErrorMessage(null);
    mutation.reset();

    try {
      await mutation.mutateAsync(parsed.data);
    } catch {
      /*
       * The mutation error is surfaced through `errorMessage`, and the caller
       * decides whether to keep the dialog open.
       */
      return;
    }

    setEmail("");
    setRole("member");
    await options.onInvited();
  }

  return {
    email,
    errorMessage: readInviteErrorMessage(mutation.error),
    fieldErrorMessage,
    isPending: mutation.isPending,
    isValid,
    reset: () => {
      setEmail("");
      setFieldErrorMessage(null);
      setRole("member");
      mutation.reset();
    },
    role,
    setEmail: (value: string) => {
      setEmail(value);
      setFieldErrorMessage(null);
    },
    setRole: (value: AssignableOrganizationRole) => {
      setRole(options.canAssignAdmin ? value : "member");
    },
    submit: () => {
      void submit();
    },
  };
}

/*
 * Known failure codes are translated into actionable copy. Anything else stays
 * generic so provider or database details never reach the browser.
 */
function readInviteErrorMessage(error: unknown): string | null {
  if (error === null || error === undefined) {
    return null;
  }

  if (!(error instanceof ApiClientError)) {
    return "The invitation could not be sent.";
  }

  switch (error.code) {
    case "FORBIDDEN":
      return "You are not allowed to invite members to this workspace.";
    case "INVITATION_ALREADY_PENDING":
      return "An invitation is already pending for that email address. Use Resend instead.";
    case "INVITATION_EMAIL_FAILED":
      return "The invitation was saved but the email could not be delivered. Try resending it.";
    case "INVITATION_LIMIT_REACHED":
      return "This workspace has reached its pending invitation limit.";
    case "MEMBER_ALREADY_IN_ORGANIZATION":
      return "That person is already a member of this workspace.";
    case "MEMBER_LIMIT_REACHED":
      return "This workspace has reached its member limit.";
    case "VALIDATION_ERROR":
      return "Enter a valid email address.";
    default:
      return "The invitation could not be sent.";
  }
}

export { readInviteErrorMessage, useInviteMemberForm, type InviteMemberFormState };
