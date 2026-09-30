function projectIssuesPath(organizationSlug: string, projectSlug: string): string {
  return `/workspaces/${encodeURIComponent(organizationSlug)}/projects/${encodeURIComponent(projectSlug)}/issues`;
}

function projectBoardPath(organizationSlug: string, projectSlug: string): string {
  return `${projectIssuesPath(organizationSlug, projectSlug)}/board`;
}

export { projectBoardPath, projectIssuesPath };
