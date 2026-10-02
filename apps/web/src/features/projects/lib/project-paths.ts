function projectOverviewPath(organizationSlug: string, projectSlug: string): string {
  return `/workspaces/${encodeURIComponent(organizationSlug)}/projects/${encodeURIComponent(projectSlug)}`;
}

function projectSettingsPath(organizationSlug: string, projectSlug: string): string {
  return `${projectOverviewPath(organizationSlug, projectSlug)}/settings`;
}

export { projectOverviewPath, projectSettingsPath };
