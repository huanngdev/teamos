/*
 * Canonical workspace URLs. Route builders live here so links, redirects, and
 * navigation guards cannot drift apart.
 */
function workspacesNewPath(): string {
  return "/workspaces/new";
}

function workspaceProjectsPath(slug: string): string {
  return `/workspaces/${encodeURIComponent(slug)}/projects`;
}

function workspaceMembersPath(slug: string): string {
  return `/workspaces/${encodeURIComponent(slug)}/members`;
}

export { workspaceMembersPath, workspaceProjectsPath, workspacesNewPath };
