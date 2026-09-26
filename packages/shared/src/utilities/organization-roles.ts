import { z } from "zod";

const organizationRoleSchema = z.enum(["owner", "admin", "member"]);

type OrganizationRole = z.infer<typeof organizationRoleSchema>;

const organizationRoles = organizationRoleSchema.options;

/*
 * Owner is deliberately excluded. Ownership changes require a dedicated
 * transfer flow with its own confirmation and last-owner protection, so no
 * generic invite or role control may grant it.
 */
const assignableOrganizationRoleSchema = z.enum(["admin", "member"]);

type AssignableOrganizationRole = z.infer<typeof assignableOrganizationRoleSchema>;

const assignableOrganizationRoles = assignableOrganizationRoleSchema.options;

/*
 * The single source of display copy for an organization role. UI must resolve
 * labels through `getOrganizationRoleLabel` (or this record for option lists),
 * never by rendering the stored value or mechanically capitalizing it.
 */
const organizationRoleLabels: Record<OrganizationRole, string> = {
  admin: "Admin",
  member: "Member",
  owner: "Owner",
};

function getOrganizationRoleLabel(role: OrganizationRole): string {
  return organizationRoleLabels[role];
}

function isOrganizationAdministrator(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin";
}

const organizationRolePrecedence: Record<OrganizationRole, number> = {
  admin: 2,
  member: 1,
  owner: 3,
};

/*
 * Better Auth 1.7 accepts multiple roles and persists them comma-separated.
 * Every segment is inspected and the highest privilege wins, so a value such as
 * `"admin,owner"` is still recognized as an owner. Looking only at the first
 * segment would downgrade an owner and let generic member management touch it.
 */
function parseOrganizationRole(value: string): OrganizationRole | undefined {
  let highest: OrganizationRole | undefined;

  for (const segment of value.split(",")) {
    const parsed = organizationRoleSchema.safeParse(segment.trim());

    if (
      parsed.success &&
      (highest === undefined ||
        organizationRolePrecedence[parsed.data] > organizationRolePrecedence[highest])
    ) {
      highest = parsed.data;
    }
  }

  return highest;
}

function parseAssignableOrganizationRole(
  value: string | null,
): AssignableOrganizationRole | undefined {
  const parsed = assignableOrganizationRoleSchema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}

function canViewPendingInvitations(role: OrganizationRole): boolean {
  return isOrganizationAdministrator(role);
}

/*
 * Renaming is routine administration, so admins share it with owners. Deleting
 * a workspace is a lifecycle action that removes every project and membership,
 * so it stays owner-only.
 */
function canUpdateOrganization(role: OrganizationRole): boolean {
  return isOrganizationAdministrator(role);
}

function canDeleteOrganization(role: OrganizationRole): boolean {
  return role === "owner";
}

function canAssignOrganizationRole(actorRole: OrganizationRole, role: string): boolean {
  return (
    isOrganizationAdministrator(actorRole) &&
    assignableOrganizationRoleSchema.safeParse(role).success
  );
}

/*
 * Owners are only reachable through the ownership transfer flow, so member
 * management never accepts an owner as the target.
 */
function canManageOrganizationMember(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
): boolean {
  if (!isOrganizationAdministrator(actorRole)) {
    return false;
  }

  return targetRole !== "owner";
}

export {
  assignableOrganizationRoleSchema,
  assignableOrganizationRoles,
  canAssignOrganizationRole,
  canDeleteOrganization,
  canManageOrganizationMember,
  canUpdateOrganization,
  canViewPendingInvitations,
  getOrganizationRoleLabel,
  isOrganizationAdministrator,
  organizationRoleLabels,
  organizationRoleSchema,
  parseAssignableOrganizationRole,
  organizationRoles,
  parseOrganizationRole,
  type AssignableOrganizationRole,
  type OrganizationRole,
};
