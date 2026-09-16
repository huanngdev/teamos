import { describe, expect, test } from "bun:test";

import { isOrganizationAdministrator, parseOrganizationRole } from "./organization-roles.js";

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
