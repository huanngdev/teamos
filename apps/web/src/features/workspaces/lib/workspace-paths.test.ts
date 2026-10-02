import { expect, test } from "vitest";

import {
  createWorkspacePath,
  workspaceMembersPath,
  workspaceProjectsPath,
  workspaceSettingsPath,
  workspacesNewPath,
} from "./workspace-paths";

test("builds short workspace paths and encodes slugs", () => {
  expect(workspacesNewPath()).toBe(createWorkspacePath);
  expect(workspacesNewPath()).toBe("/w/new");
  expect(workspaceProjectsPath("acme")).toBe("/w/acme/projects");
  expect(workspaceMembersPath("acme")).toBe("/w/acme/members");
  expect(workspaceSettingsPath("acme")).toBe("/w/acme/settings");
  expect(workspaceProjectsPath("a/b")).toBe("/w/a%2Fb/projects");
});
