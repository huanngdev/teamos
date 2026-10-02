import { projectOverviewPath, projectRoutePattern } from "@/features/projects/lib/project-paths";

const projectViewsSegment = "views";
const projectViewSegment = "views/:viewId";
const projectViewsRoutePattern = `${projectRoutePattern}/${projectViewsSegment}`;
const projectViewRoutePattern = `${projectRoutePattern}/${projectViewSegment}`;

function projectViewsPath(organizationSlug: string, projectSlug: string): string {
  return `${projectOverviewPath(organizationSlug, projectSlug)}/${projectViewsSegment}`;
}

function projectViewPath(organizationSlug: string, projectSlug: string, viewId: string): string {
  return `${projectViewsPath(organizationSlug, projectSlug)}/${encodeURIComponent(viewId)}`;
}

export {
  projectViewPath,
  projectViewRoutePattern,
  projectViewSegment,
  projectViewsPath,
  projectViewsRoutePattern,
  projectViewsSegment,
};
