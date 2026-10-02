const createWorkspacePath = "/w/new";
const workspaceRoutePattern = "/w/:organizationSlug";
const workspaceMembersSegment = "members";
const workspaceProjectsSegment = "projects";
const workspaceSettingsSegment = "settings";

function workspacesNewPath(): string {
  return createWorkspacePath;
}

function workspaceProjectsPath(slug: string): string {
  return `/w/${encodeURIComponent(slug)}/${workspaceProjectsSegment}`;
}

function workspaceMembersPath(slug: string): string {
  return `/w/${encodeURIComponent(slug)}/${workspaceMembersSegment}`;
}

function workspaceSettingsPath(slug: string): string {
  return `/w/${encodeURIComponent(slug)}/${workspaceSettingsSegment}`;
}

export {
  createWorkspacePath,
  workspaceMembersPath,
  workspaceMembersSegment,
  workspaceProjectsPath,
  workspaceProjectsSegment,
  workspaceRoutePattern,
  workspaceSettingsPath,
  workspaceSettingsSegment,
  workspacesNewPath,
};
