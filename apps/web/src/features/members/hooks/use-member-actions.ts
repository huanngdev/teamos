import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AssignableOrganizationRole } from "@teamos/shared";

import { notify } from "@/shared";
import {
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "../api/organization-members-api";
import { useWorkspaceMembersInvalidator } from "./use-workspace-members";

interface UseMemberActionsOptions {
  organizationSlug: string;
}

interface MemberActionsState {
  changeRole: (memberId: string, role: AssignableOrganizationRole) => void;
  confirmRemoval: (memberId: string) => void;
  pendingRoleMemberId: string | null;
  removalTarget: string | null;
  requestRemoval: (memberId: string) => void;
  dismissRemoval: () => void;
  removePending: boolean;
}

function useMemberActions(options: UseMemberActionsOptions): MemberActionsState {
  const invalidate = useWorkspaceMembersInvalidator(options.organizationSlug);
  const [removalTarget, setRemovalTarget] = useState<string | null>(null);

  const roleMutation = useMutation({
    mutationFn: (input: { memberId: string; role: AssignableOrganizationRole }) =>
      updateOrganizationMemberRole(options.organizationSlug, input.memberId, input.role),
    onError: () => {
      notify.error("The member role could not be updated.");
    },
    onSettled: () => {
      void invalidate();
    },
    onSuccess: () => {
      notify.success("Member role updated");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeOrganizationMember(options.organizationSlug, memberId),
    onError: () => {
      notify.error("The member could not be removed.");
    },
    onSettled: () => {
      setRemovalTarget(null);
      void invalidate();
    },
    onSuccess: () => {
      notify.success("Member removed from workspace");
    },
  });

  return {
    changeRole: (memberId, role) => {
      roleMutation.mutate({ memberId, role });
    },
    confirmRemoval: (memberId) => {
      removeMutation.mutate(memberId);
    },
    dismissRemoval: () => {
      setRemovalTarget(null);
    },
    pendingRoleMemberId: roleMutation.isPending ? (roleMutation.variables?.memberId ?? null) : null,
    removalTarget,
    removePending: removeMutation.isPending,
    requestRemoval: (memberId) => {
      setRemovalTarget(memberId);
    },
  };
}

export { useMemberActions, type MemberActionsState };
