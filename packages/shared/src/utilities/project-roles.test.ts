import { describe, expect, test } from "bun:test";

import type { OrganizationRole } from "./organization-roles.js";
import {
  canPerformProjectAction,
  projectRoleSchema,
  projectVisibilitySchema,
  type ProjectAction,
  type ProjectRole,
  type ProjectVisibility,
} from "./project-roles.js";

function access(
  organizationRole: OrganizationRole,
  projectRole: ProjectRole | null,
  visibility: ProjectVisibility = "workspace",
) {
  return { organizationRole, projectRole, visibility };
}

const allActions: readonly ProjectAction[] = [
  "view",
  "update",
  "delete",
  "manage-members",
  "create-issue",
  "update-issue",
  "delete-issue",
];

describe("project role schemas", () => {
  test("only exposes the supported project roles and visibilities", () => {
    expect(projectRoleSchema.options).toEqual(["lead", "member", "viewer"]);
    expect(projectVisibilitySchema.options).toEqual(["workspace", "private"]);
  });
});

describe("canPerformProjectAction", () => {
  test("grants organization administrators every action on private projects", () => {
    for (const organizationRole of ["owner", "admin"] as const) {
      for (const action of allActions) {
        expect(canPerformProjectAction(action, access(organizationRole, null, "private"))).toBe(
          true,
        );
      }
    }
  });

  test("lets workspace members read a workspace project without a project role", () => {
    expect(canPerformProjectAction("view", access("member", null, "workspace"))).toBe(true);
  });

  test("hides a private project without a project role", () => {
    for (const action of allActions) {
      expect(canPerformProjectAction(action, access("member", null, "private"))).toBe(false);
    }
  });

  test("reserves project deletion for organization administrators", () => {
    for (const projectRole of projectRoleSchema.options) {
      expect(canPerformProjectAction("delete", access("member", projectRole, "private"))).toBe(
        false,
      );
    }

    expect(canPerformProjectAction("delete", access("owner", null, "private"))).toBe(true);
  });

  test("restricts viewers to reading", () => {
    expect(canPerformProjectAction("view", access("member", "viewer", "private"))).toBe(true);

    for (const action of allActions.filter((candidate) => candidate !== "view")) {
      expect(canPerformProjectAction(action, access("member", "viewer", "private"))).toBe(false);
    }
  });

  test("lets project members work on issues without managing the project", () => {
    expect(canPerformProjectAction("create-issue", access("member", "member", "private"))).toBe(
      true,
    );
    expect(canPerformProjectAction("update-issue", access("member", "member", "private"))).toBe(
      true,
    );
    expect(canPerformProjectAction("delete-issue", access("member", "member", "private"))).toBe(
      false,
    );
    expect(canPerformProjectAction("update", access("member", "member", "private"))).toBe(false);
    expect(canPerformProjectAction("manage-members", access("member", "member", "private"))).toBe(
      false,
    );
  });

  test("gives project leads full project control except deletion", () => {
    for (const action of allActions.filter((candidate) => candidate !== "delete")) {
      expect(canPerformProjectAction(action, access("member", "lead", "private"))).toBe(true);
    }

    expect(canPerformProjectAction("delete", access("member", "lead", "private"))).toBe(false);
  });

  test("keeps the organization administrator override above the project role", () => {
    expect(canPerformProjectAction("manage-members", access("admin", "viewer", "private"))).toBe(
      true,
    );
    expect(canPerformProjectAction("delete", access("admin", "viewer", "private"))).toBe(true);
  });
});
