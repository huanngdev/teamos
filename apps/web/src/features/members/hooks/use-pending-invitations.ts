import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { OrganizationInvitation } from "@teamos/shared";

import {
  cancelOrganizationInvitation,
  listOrganizationInvitations,
  resendOrganizationInvitation,
} from "../api/organization-members-api";
import { memberKeys } from "../query-keys";

interface UsePendingInvitationsOptions {
  enabled: boolean;
  organizationSlug: string;
}

interface PendingInvitationsState {
  cancelTarget: OrganizationInvitation | null;
  cancelError: string | null;
  confirmCancel: () => void;
  dismissCancel: () => void;
  errorMessage: string | null;
  invitations: OrganizationInvitation[];
  isPending: boolean;
  pendingResendId: string | null;
  requestCancel: (invitationId: string) => void;
  resend: (invitationId: string) => void;
  retry: () => Promise<void>;
}

function usePendingInvitations(options: UsePendingInvitationsOptions): PendingInvitationsState {
  const query = useQuery({
    enabled: options.enabled,
    queryFn: () => listOrganizationInvitations(options.organizationSlug),
    queryKey: memberKeys(options.organizationSlug).invitations(),
  });
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  const cancelMutation = useMutation({
    mutationFn: (invitationId: string) =>
      cancelOrganizationInvitation(options.organizationSlug, invitationId),
    onSettled: () => {
      setCancelTargetId(null);
      void query.refetch();
    },
  });

  const resendMutation = useMutation({
    mutationFn: (invitationId: string) =>
      resendOrganizationInvitation(options.organizationSlug, invitationId),
    onSettled: () => {
      void query.refetch();
    },
  });

  const invitations = query.data ?? [];

  return {
    cancelError: cancelMutation.isError
      ? "The invitation could not be cancelled."
      : resendMutation.isError
        ? "The invitation could not be resent."
        : null,
    cancelTarget: invitations.find((invitation) => invitation.id === cancelTargetId) ?? null,
    confirmCancel: () => {
      if (cancelTargetId !== null) {
        cancelMutation.mutate(cancelTargetId);
      }
    },
    dismissCancel: () => {
      setCancelTargetId(null);
    },
    errorMessage: query.isError ? "Pending invitations could not be loaded." : null,
    invitations,
    isPending: query.isPending,
    pendingResendId: resendMutation.isPending ? (resendMutation.variables ?? null) : null,
    requestCancel: (invitationId: string) => {
      setCancelTargetId(invitationId);
    },
    resend: (invitationId: string) => {
      resendMutation.mutate(invitationId);
    },
    retry: async () => {
      await query.refetch();
    },
  };
}

export { usePendingInvitations, type PendingInvitationsState };
