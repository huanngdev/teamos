import { projectOverviewPath, projectRoutePattern } from "@/features/projects/lib/project-paths";

const projectBoardSegment = "board";
const projectIssuesSegment = "issues";
const projectBoardRoutePattern = `${projectRoutePattern}/${projectBoardSegment}`;
const projectIssuesRoutePattern = `${projectRoutePattern}/${projectIssuesSegment}`;

function projectIssuesPath(organizationSlug: string, projectSlug: string): string {
  return `${projectOverviewPath(organizationSlug, projectSlug)}/${projectIssuesSegment}`;
}

const projectIssueRoutePattern = `${projectIssuesRoutePattern}/:issueCode`;

function projectBoardPath(organizationSlug: string, projectSlug: string): string {
  return `${projectOverviewPath(organizationSlug, projectSlug)}/${projectBoardSegment}`;
}

function projectIssuePath(
  organizationSlug: string,
  projectSlug: string,
  issueCode: string,
): string {
  return `${projectIssuesPath(organizationSlug, projectSlug)}/${encodeURIComponent(issueCode)}`;
}

export {
  projectBoardPath,
  projectBoardRoutePattern,
  projectBoardSegment,
  projectIssuePath,
  projectIssueRoutePattern,
  projectIssuesPath,
  projectIssuesRoutePattern,
  projectIssuesSegment,
};
