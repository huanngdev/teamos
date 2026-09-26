function projectIssuesPath(organizationSlug: string, projectSlug: string): string {
  return `/workspaces/${encodeURIComponent(organizationSlug)}/projects/${encodeURIComponent(projectSlug)}/issues`;
}

export { projectIssuesPath };
