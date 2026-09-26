import {
  issueListResponseSchema,
  issueResponseSchema,
  projectStatusListResponseSchema,
  projectStatusResponseSchema,
  type CreateIssueRequest,
  type CreateProjectStatusRequest,
  type IssueSummary,
  type ProjectStatusSummary,
  type UpdateIssueRequest,
  type UpdateProjectStatusRequest,
} from "@teamos/shared";

import { requestParsed, requestVoid } from "@/shared/api/api-client";

function issuePath(slug: string, projectId: string, suffix = ""): string {
  return `/api/organizations/${encodeURIComponent(slug)}/projects/${encodeURIComponent(projectId)}${suffix}`;
}

async function listProjectStatuses(
  slug: string,
  projectId: string,
): Promise<ProjectStatusSummary[]> {
  const response = await requestParsed(projectStatusListResponseSchema, {
    method: "GET",
    url: issuePath(slug, projectId, "/statuses"),
  });

  return response.statuses;
}

async function createProjectStatus(
  slug: string,
  projectId: string,
  request: CreateProjectStatusRequest,
): Promise<ProjectStatusSummary> {
  const response = await requestParsed(projectStatusResponseSchema, {
    data: request,
    method: "POST",
    url: issuePath(slug, projectId, "/statuses"),
  });

  return response.status;
}

async function updateProjectStatus(
  slug: string,
  projectId: string,
  statusId: string,
  request: UpdateProjectStatusRequest,
): Promise<ProjectStatusSummary> {
  const response = await requestParsed(projectStatusResponseSchema, {
    data: request,
    method: "PATCH",
    url: issuePath(slug, projectId, `/statuses/${encodeURIComponent(statusId)}`),
  });

  return response.status;
}

async function deleteProjectStatus(
  slug: string,
  projectId: string,
  statusId: string,
): Promise<void> {
  await requestVoid({
    method: "DELETE",
    url: issuePath(slug, projectId, `/statuses/${encodeURIComponent(statusId)}`),
  });
}

async function listIssues(
  slug: string,
  projectId: string,
): Promise<{ issues: IssueSummary[]; total: number }> {
  return requestParsed(issueListResponseSchema, {
    method: "GET",
    url: issuePath(slug, projectId, "/issues"),
  });
}

async function createIssue(
  slug: string,
  projectId: string,
  request: CreateIssueRequest,
): Promise<IssueSummary> {
  const response = await requestParsed(issueResponseSchema, {
    data: request,
    method: "POST",
    url: issuePath(slug, projectId, "/issues"),
  });

  return response.issue;
}

async function updateIssue(
  slug: string,
  projectId: string,
  issueId: string,
  request: UpdateIssueRequest,
): Promise<IssueSummary> {
  const response = await requestParsed(issueResponseSchema, {
    data: request,
    method: "PATCH",
    url: issuePath(slug, projectId, `/issues/${encodeURIComponent(issueId)}`),
  });

  return response.issue;
}

async function deleteIssue(slug: string, projectId: string, issueId: string): Promise<void> {
  await requestVoid({
    method: "DELETE",
    url: issuePath(slug, projectId, `/issues/${encodeURIComponent(issueId)}`),
  });
}

export {
  createIssue,
  createProjectStatus,
  deleteIssue,
  deleteProjectStatus,
  listIssues,
  listProjectStatuses,
  updateIssue,
  updateProjectStatus,
};
