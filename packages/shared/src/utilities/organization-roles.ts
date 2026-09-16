import { z } from "zod";

const organizationRoleSchema = z.enum(["owner", "admin", "member"]);

type OrganizationRole = z.infer<typeof organizationRoleSchema>;

const organizationRoles = organizationRoleSchema.options;

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

export {
  isOrganizationAdministrator,
  organizationRoleSchema,
  organizationRoles,
  parseOrganizationRole,
  type OrganizationRole,
};
