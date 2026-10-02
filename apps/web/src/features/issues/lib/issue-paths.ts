import { projectOverviewPath, projectRoutePattern } from "@/features/projects/lib/project-paths";

const projectBoardSegment = "board";
const projectIssuesSegment = "issues";
const projectBoardRoutePattern = `${projectRoutePattern}/${projectBoardSegment}`;
const projectIssuesRoutePattern = `${projectRoutePattern}/${projectIssuesSegment}`;

function projectIssuesPath(organizationSlug: string, projectSlug: string): string {
  return `${projectOverviewPath(organizationSlug, projectSlug)}/${projectIssuesSegment}`;
}

function projectBoardPath(organizationSlug: string, projectSlug: string): string {
  return `${projectOverviewPath(organizationSlug, projectSlug)}/${projectBoardSegment}`;
}

export {
  projectBoardPath,
  projectBoardRoutePattern,
  projectBoardSegment,
  projectIssuesPath,
  projectIssuesRoutePattern,
  projectIssuesSegment,
};
