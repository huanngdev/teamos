function projectOverviewPath(organizationSlug: string, projectSlug: string): string {
  return `/workspaces/${encodeURIComponent(organizationSlug)}/projects/${encodeURIComponent(projectSlug)}`;
}

export { projectOverviewPath };
