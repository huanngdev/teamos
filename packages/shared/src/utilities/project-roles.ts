import { z } from "zod";

import { isOrganizationAdministrator, type OrganizationRole } from "./organization-roles.js";

const projectRoleSchema = z.enum(["lead", "member", "viewer"]);

type ProjectRole = z.infer<typeof projectRoleSchema>;

const projectRoles = projectRoleSchema.options;

const projectVisibilitySchema = z.enum(["workspace", "private"]);

type ProjectVisibility = z.infer<typeof projectVisibilitySchema>;

const projectVisibilities = projectVisibilitySchema.options;

/*
 * `projectRoleLabels` and `projectVisibilityLabels` are the single source of
 * display copy for their domains. UI resolves labels through the matching
 * `get...Label` function (or the record for option lists) instead of rendering
 * the stored value.
 */
const projectRoleLabels: Record<ProjectRole, string> = {
  lead: "Lead",
  member: "Member",
  viewer: "Viewer",
};

const projectVisibilityLabels: Record<ProjectVisibility, string> = {
  private: "Private",
  workspace: "Workspace",
};

function getProjectRoleLabel(role: ProjectRole): string {
  return projectRoleLabels[role];
}

function getProjectVisibilityLabel(visibility: ProjectVisibility): string {
  return projectVisibilityLabels[visibility];
}

const projectActionSchema = z.enum([
  "view",
  "update",
  "delete",
  "manage-members",
  "create-issue",
  "update-issue",
  "delete-issue",
]);

type ProjectAction = z.infer<typeof projectActionSchema>;

interface ProjectAccessContext {
  organizationRole: OrganizationRole;
  projectRole: ProjectRole | null;
  visibility: ProjectVisibility;
}

const projectRoleCapabilities: Readonly<Record<ProjectRole, readonly ProjectAction[]>> = {
  lead: ["view", "update", "manage-members", "create-issue", "update-issue", "delete-issue"],
  member: ["view", "create-issue", "update-issue"],
  viewer: ["view"],
};

/*
 * Organization administrators always keep full control over every project,
 * including private ones, so a project can never lock the workspace out of its
 * own governance. Everyone else is additive on top of their project role, and a
 * workspace-visible project grants non-members read access only.
 */
function canPerformProjectAction(action: ProjectAction, context: ProjectAccessContext): boolean {
  if (isOrganizationAdministrator(context.organizationRole)) {
    return true;
  }

  if (action === "delete") {
    return false;
  }

  if (context.projectRole !== null) {
    return projectRoleCapabilities[context.projectRole].includes(action);
  }

  return action === "view" && context.visibility === "workspace";
}

function parseProjectRole(value: string | null): ProjectRole | undefined {
  const parsed = projectRoleSchema.safeParse(value?.trim() ?? "");

  return parsed.success ? parsed.data : undefined;
}

function parseProjectVisibility(value: string | null): ProjectVisibility | undefined {
  const parsed = projectVisibilitySchema.safeParse(value?.trim() ?? "");

  return parsed.success ? parsed.data : undefined;
}

export {
  canPerformProjectAction,
  getProjectRoleLabel,
  getProjectVisibilityLabel,
  parseProjectRole,
  parseProjectVisibility,
  projectActionSchema,
  projectRoleCapabilities,
  projectRoleLabels,
  projectRoleSchema,
  projectRoles,
  projectVisibilities,
  projectVisibilityLabels,
  projectVisibilitySchema,
  type ProjectAccessContext,
  type ProjectAction,
  type ProjectRole,
  type ProjectVisibility,
};
