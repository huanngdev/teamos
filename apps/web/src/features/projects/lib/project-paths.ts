const projectRoutePattern = "/w/:organizationSlug/p/:projectSlug";
const projectSettingsSegment = "settings";
const projectSettingsRoutePattern = `${projectRoutePattern}/${projectSettingsSegment}`;

function projectOverviewPath(organizationSlug: string, projectSlug: string): string {
  return `/w/${encodeURIComponent(organizationSlug)}/p/${encodeURIComponent(projectSlug)}`;
}

function projectSettingsPath(organizationSlug: string, projectSlug: string): string {
  return `${projectOverviewPath(organizationSlug, projectSlug)}/${projectSettingsSegment}`;
}

export {
  projectOverviewPath,
  projectRoutePattern,
  projectSettingsPath,
  projectSettingsRoutePattern,
  projectSettingsSegment,
};
