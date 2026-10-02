function projectViewsPath(organizationSlug: string, projectSlug: string): string {
  return `/workspaces/${encodeURIComponent(organizationSlug)}/projects/${encodeURIComponent(projectSlug)}/views`;
}

function projectViewPath(organizationSlug: string, projectSlug: string, viewId: string): string {
  return `${projectViewsPath(organizationSlug, projectSlug)}/${encodeURIComponent(viewId)}`;
}

export { projectViewPath, projectViewsPath };
