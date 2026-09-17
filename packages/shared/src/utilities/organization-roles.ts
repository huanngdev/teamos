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

function isOrganizationAdministrator(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin";
}

function parseOrganizationRole(value: string): OrganizationRole | undefined {
  const [primaryRole] = value
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);

  const parsed = organizationRoleSchema.safeParse(primaryRole);

  return parsed.success ? parsed.data : undefined;
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
  canManageOrganizationMember,
  canViewPendingInvitations,
  isOrganizationAdministrator,
  organizationRoleSchema,
  parseAssignableOrganizationRole,
  organizationRoles,
  parseOrganizationRole,
  type AssignableOrganizationRole,
  type OrganizationRole,
};
