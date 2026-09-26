/*
 * Canonical project URLs. The overview is the project index so a second project
 * page can be added later without renaming this route.
 */
function projectOverviewPath(organizationSlug: string, projectSlug: string): string {
  return `/workspaces/${encodeURIComponent(organizationSlug)}/projects/${encodeURIComponent(projectSlug)}`;
}

export { projectOverviewPath };
