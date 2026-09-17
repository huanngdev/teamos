import { useState } from "react";
import type { OrganizationRole } from "@teamos/shared";

import { useInviteMemberForm, type InviteMemberFormState } from "./use-invite-member-form";
import { useMemberActions } from "./use-member-actions";
import {
  useOrganizationPermissions,
  type OrganizationPermissions,
} from "./use-organization-permissions";
import { usePendingInvitations, type PendingInvitationsState } from "./use-pending-invitations";
import { useWorkspaceMembers, type WorkspaceMembersState } from "./use-workspace-members";

interface UseWorkspaceMembersPanelOptions {
  actorRole: OrganizationRole;
  currentUserId: string;
  enabled: boolean;
  organizationSlug: string;
}

interface WorkspaceMembersPanelView {
  currentUserId: string;
  invitations: PendingInvitationsState;
  invite: {
    close: () => void;
    form: InviteMemberFormState;
    isOpen: boolean;
    open: () => void;
  };
  members: WorkspaceMembersState;
  pendingRoleMemberId: string | null;
  permissions: OrganizationPermissions;
  removal: {
    dismiss: () => void;
    isPending: boolean;
    memberName: string | null;
    memberId: string | null;
    confirm: () => void;
  };
  actions: {
    changeRole: (memberId: string, role: "admin" | "member") => void;
    requestRemoval: (memberId: string) => void;
  };
}

/*
 * Orchestrates the member management feature so the page and the presentational
 * panel only render typed state and forward callbacks.
 */
function useWorkspaceMembersPanel(
  options: UseWorkspaceMembersPanelOptions,
): WorkspaceMembersPanelView {
  const permissions = useOrganizationPermissions(options.actorRole);
  const members = useWorkspaceMembers({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
  });
  const invitations = usePendingInvitations({
    enabled: options.enabled && permissions.canViewInvitations,
    organizationSlug: options.organizationSlug,
  });
  const actions = useMemberActions({ organizationSlug: options.organizationSlug });
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const invite = useInviteMemberForm({
    canAssignAdmin: permissions.canAssignRole("admin"),
    onInvited: async () => {
      setIsInviteOpen(false);
      await invitations.retry();
    },
    organizationSlug: options.organizationSlug,
  });

  const removalMember = members.members.find((member) => member.id === actions.removalTarget);

  return {
    actions: {
      changeRole: actions.changeRole,
      requestRemoval: actions.requestRemoval,
    },
    invitations,
    invite: {
      close: () => {
        setIsInviteOpen(false);
        invite.reset();
      },
      form: invite,
      isOpen: isInviteOpen,
      open: () => {
        setIsInviteOpen(true);
      },
    },
    currentUserId: options.currentUserId,
    members,
    pendingRoleMemberId: actions.pendingRoleMemberId,
    permissions,
    removal: {
      confirm: () => {
        if (actions.removalTarget !== null) {
          actions.confirmRemoval(actions.removalTarget);
        }
      },
      dismiss: actions.dismissRemoval,
      isPending: actions.removePending,
      memberId: actions.removalTarget,
      memberName: removalMember?.name ?? null,
    },
  };
}

export { useWorkspaceMembersPanel, type WorkspaceMembersPanelView };
