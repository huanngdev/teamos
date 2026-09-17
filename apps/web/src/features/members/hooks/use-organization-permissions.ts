import { useMemo } from "react";
import {
  canAssignOrganizationRole,
  canManageOrganizationMember,
  canViewPendingInvitations,
  isOrganizationAdministrator,
  type OrganizationRole,
} from "@teamos/shared";

/*
 * Translates the shared organization policies into the explicit capabilities
 * the UI renders. Components never compare role names themselves, so a policy
 * change is applied in one place.
 */
interface OrganizationPermissions {
  canAssignRole: (role: string) => boolean;
  canInviteMembers: boolean;
  canManageMember: (memberRole: OrganizationRole) => boolean;
  canViewInvitations: boolean;
}

function useOrganizationPermissions(actorRole: OrganizationRole): OrganizationPermissions {
  return useMemo(
    () => ({
      canAssignRole: (role: string) => canAssignOrganizationRole(actorRole, role),
      canInviteMembers: isOrganizationAdministrator(actorRole),
      canManageMember: (memberRole: OrganizationRole) =>
        canManageOrganizationMember(actorRole, memberRole),
      canViewInvitations: canViewPendingInvitations(actorRole),
    }),
    [actorRole],
  );
}

export { useOrganizationPermissions, type OrganizationPermissions };
