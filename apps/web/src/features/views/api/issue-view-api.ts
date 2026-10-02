import {
  issueViewListResponseSchema,
  issueViewResponseSchema,
  type CreateIssueViewRequest,
  type IssueViewListResponse,
  type IssueViewSummary,
  type UpdateIssueViewRequest,
} from "@teamos/shared";

import { requestParsed, requestVoid } from "@/shared/api/api-client";

function viewPath(slug: string, projectId: string, suffix = ""): string {
  return `/api/organizations/${encodeURIComponent(slug)}/projects/${encodeURIComponent(projectId)}/views${suffix}`;
}

async function listIssueViews(
  slug: string,
  projectId: string,
  params: { limit: number; offset: number; search?: string },
): Promise<IssueViewListResponse> {
  return requestParsed(issueViewListResponseSchema, {
    method: "GET",
    params,
    url: viewPath(slug, projectId),
  });
}

async function createIssueView(
  slug: string,
  projectId: string,
  request: CreateIssueViewRequest,
): Promise<IssueViewSummary> {
  const response = await requestParsed(issueViewResponseSchema, {
    data: request,
    method: "POST",
    url: viewPath(slug, projectId),
  });

  return response.view;
}

async function getIssueView(
  slug: string,
  projectId: string,
  viewId: string,
): Promise<IssueViewSummary> {
  const response = await requestParsed(issueViewResponseSchema, {
    method: "GET",
    url: viewPath(slug, projectId, `/${encodeURIComponent(viewId)}`),
  });

  return response.view;
}

async function updateIssueView(
  slug: string,
  projectId: string,
  viewId: string,
  request: UpdateIssueViewRequest,
): Promise<IssueViewSummary> {
  const response = await requestParsed(issueViewResponseSchema, {
    data: request,
    method: "PATCH",
    url: viewPath(slug, projectId, `/${encodeURIComponent(viewId)}`),
  });

  return response.view;
}

async function deleteIssueView(slug: string, projectId: string, viewId: string): Promise<void> {
  await requestVoid({
    method: "DELETE",
    url: viewPath(slug, projectId, `/${encodeURIComponent(viewId)}`),
  });
}

export { createIssueView, deleteIssueView, getIssueView, listIssueViews, updateIssueView };
