import { describe, expect, test } from "bun:test";

import {
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
  parseOrganizationRole,
} from "./organization-roles.js";

describe("parseOrganizationRole", () => {
  test("parses a single role", () => {
    expect(parseOrganizationRole("owner")).toBe("owner");
  });

  test("parses the primary role from a multi-role value", () => {
    expect(parseOrganizationRole("admin, member")).toBe("admin");
  });

  test("recognizes an owner anywhere in a multi-role value", () => {
    expect(parseOrganizationRole("admin,owner")).toBe("owner");
    expect(parseOrganizationRole("member, owner")).toBe("owner");
    expect(parseOrganizationRole("member,admin,owner")).toBe("owner");
  });

  test("ignores unknown segments but keeps a recognized role", () => {
    expect(parseOrganizationRole("member, superuser")).toBe("member");
    expect(parseOrganizationRole("superuser")).toBeUndefined();
  });

  test("returns undefined for unknown roles", () => {
    expect(parseOrganizationRole("superuser")).toBeUndefined();
    expect(parseOrganizationRole("")).toBeUndefined();
  });
});

describe("getOrganizationRoleLabel", () => {
  test("maps every organization role to non-code display copy", () => {
    for (const role of organizationRoleSchema.options) {
      expect(getOrganizationRoleLabel(role)).toBe(organizationRoleLabels[role]);
      expect(getOrganizationRoleLabel(role)).not.toBe(role);
    }
  });
});

describe("isOrganizationAdministrator", () => {
  test("treats owners and admins as administrators", () => {
    expect(isOrganizationAdministrator("owner")).toBe(true);
    expect(isOrganizationAdministrator("admin")).toBe(true);
    expect(isOrganizationAdministrator("member")).toBe(false);
  });
});

describe("assignable organization roles", () => {
  test("never exposes owner as an assignable role", () => {
    expect(assignableOrganizationRoles).toEqual(["admin", "member"]);
    expect(assignableOrganizationRoleSchema.safeParse("owner").success).toBe(false);
  });

  test("only lets administrators assign a supported role", () => {
    expect(canAssignOrganizationRole("owner", "admin")).toBe(true);
    expect(canAssignOrganizationRole("admin", "member")).toBe(true);
    expect(canAssignOrganizationRole("member", "admin")).toBe(false);
    expect(canAssignOrganizationRole("owner", "owner")).toBe(false);
    expect(canAssignOrganizationRole("owner", "superuser")).toBe(false);
  });
});

describe("organization member management", () => {
  test("only lets administrators manage other members", () => {
    expect(canManageOrganizationMember("owner", "member")).toBe(true);
    expect(canManageOrganizationMember("admin", "admin")).toBe(true);
    expect(canManageOrganizationMember("member", "member")).toBe(false);
  });

  test("never targets an owner through generic member management", () => {
    expect(canManageOrganizationMember("owner", "owner")).toBe(false);
    expect(canManageOrganizationMember("admin", "owner")).toBe(false);
  });

  test("hides pending invitations from ordinary members", () => {
    expect(canViewPendingInvitations("owner")).toBe(true);
    expect(canViewPendingInvitations("admin")).toBe(true);
    expect(canViewPendingInvitations("member")).toBe(false);
  });
});

describe("workspace lifecycle policies", () => {
  test("lets owners and admins rename a workspace", () => {
    expect(canUpdateOrganization("owner")).toBe(true);
    expect(canUpdateOrganization("admin")).toBe(true);
    expect(canUpdateOrganization("member")).toBe(false);
  });

  test("only lets an owner delete a workspace", () => {
    expect(canDeleteOrganization("owner")).toBe(true);
    expect(canDeleteOrganization("admin")).toBe(false);
    expect(canDeleteOrganization("member")).toBe(false);
  });
});
