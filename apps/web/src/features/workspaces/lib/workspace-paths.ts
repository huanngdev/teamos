function workspacesNewPath(): string {
  return "/workspaces/new";
}

function workspaceProjectsPath(slug: string): string {
  return `/workspaces/${encodeURIComponent(slug)}/projects`;
}

function workspaceMembersPath(slug: string): string {
  return `/workspaces/${encodeURIComponent(slug)}/members`;
}

function workspaceSettingsPath(slug: string): string {
  return `/workspaces/${encodeURIComponent(slug)}/settings`;
}

export { workspaceMembersPath, workspaceProjectsPath, workspaceSettingsPath, workspacesNewPath };
