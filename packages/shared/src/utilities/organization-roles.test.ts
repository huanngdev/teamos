import { describe, expect, test } from "bun:test";

import {
  assignableOrganizationRoleSchema,
  assignableOrganizationRoles,
  canAssignOrganizationRole,
  canManageOrganizationMember,
  canViewPendingInvitations,
  isOrganizationAdministrator,
  parseOrganizationRole,
} from "./organization-roles.js";

describe("parseOrganizationRole", () => {
  test("parses a single role", () => {
    expect(parseOrganizationRole("owner")).toBe("owner");
  });

  test("parses the primary role from a multi-role value", () => {
    expect(parseOrganizationRole("admin, member")).toBe("admin");
  });

  test("returns undefined for unknown roles", () => {
    expect(parseOrganizationRole("superuser")).toBeUndefined();
    expect(parseOrganizationRole("")).toBeUndefined();
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
