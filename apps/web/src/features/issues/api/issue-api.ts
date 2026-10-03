import {
  issueBoardResponseSchema,
  issueColumnPageResponseSchema,
  issueListResponseSchema,
  issueResponseSchema,
  projectStatusListResponseSchema,
  projectStatusResponseSchema,
  type CreateIssueRequest,
  type DeleteIssuesRequest,
  type CreateProjectStatusRequest,
  type IssueBoardResponse,
  type IssueColumnPageResponse,
  type IssueListResponse,
  type IssueDetail,
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
  params?: Record<string, string>,
): Promise<IssueListResponse> {
  return requestParsed(issueListResponseSchema, {
    method: "GET",
    params,
    url: issuePath(slug, projectId, "/issues"),
  });
}

async function getIssue(slug: string, projectId: string, issueId: string): Promise<IssueDetail> {
  const response = await requestParsed(issueResponseSchema, {
    method: "GET",
    url: issuePath(slug, projectId, `/issues/${encodeURIComponent(issueId)}`),
  });

  return response.issue;
}

async function getIssueByNumber(
  slug: string,
  projectId: string,
  number: string,
): Promise<IssueDetail> {
  const response = await requestParsed(issueResponseSchema, {
    method: "GET",
    url: issuePath(slug, projectId, `/issues/by-number/${encodeURIComponent(number)}`),
  });

  return response.issue;
}

async function listIssueBoard(
  slug: string,
  projectId: string,
  params?: Record<string, string>,
): Promise<IssueBoardResponse> {
  return requestParsed(issueBoardResponseSchema, {
    method: "GET",
    params,
    url: issuePath(slug, projectId, "/issue-board"),
  });
}

async function listIssueColumn(
  slug: string,
  projectId: string,
  statusId: string,
  params?: Record<string, string>,
): Promise<IssueColumnPageResponse> {
  return requestParsed(issueColumnPageResponseSchema, {
    method: "GET",
    params,
    url: issuePath(slug, projectId, `/issue-columns/${encodeURIComponent(statusId)}`),
  });
}

async function createIssue(
  slug: string,
  projectId: string,
  request: CreateIssueRequest,
): Promise<IssueDetail> {
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
): Promise<IssueDetail> {
  const response = await requestParsed(issueResponseSchema, {
    data: request,
    method: "PATCH",
    url: issuePath(slug, projectId, `/issues/${encodeURIComponent(issueId)}`),
  });

  return response.issue;
}

async function deleteIssues(
  slug: string,
  projectId: string,
  request: DeleteIssuesRequest,
): Promise<void> {
  await requestVoid({
    data: request,
    method: "POST",
    url: issuePath(slug, projectId, "/issues/bulk-delete"),
  });
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
  deleteIssues,
  deleteProjectStatus,
  getIssue,
  getIssueByNumber,
  listIssueBoard,
  listIssueColumn,
  listIssues,
  listProjectStatuses,
  updateIssue,
  updateProjectStatus,
};
