import {
  eligibleAssigneeListResponseSchema,
  projectDetailResponseSchema,
  projectListResponseSchema,
  projectMemberListResponseSchema,
  type CreateProjectRequest,
  type DeleteProjectRequest,
  type EligibleAssigneeListResponse,
  type ProjectMember,
  type ProjectRole,
  type ProjectSummary,
  type UpdateProjectRequest,
} from "@teamos/shared";

import { requestParsed, requestVoid } from "@/shared/api/api-client";

function projectPath(slug: string, suffix = ""): string {
  return `/api/organizations/${encodeURIComponent(slug)}/projects${suffix}`;
}

interface ListProjectsOptions {
  search?: string | undefined;
}

async function listProjects(
  slug: string,
  options: ListProjectsOptions = {},
): Promise<ProjectSummary[]> {
  const response = await requestParsed(projectListResponseSchema, {
    method: "GET",
    params: options.search === undefined ? {} : { search: options.search },
    url: projectPath(slug),
  });

  return response.projects;
}

async function createProject(slug: string, request: CreateProjectRequest): Promise<ProjectSummary> {
  const response = await requestParsed(projectDetailResponseSchema, {
    data: request,
    method: "POST",
    url: projectPath(slug),
  });

  return response.project;
}

async function updateProject(
  slug: string,
  projectId: string,
  request: UpdateProjectRequest,
): Promise<ProjectSummary> {
  const response = await requestParsed(projectDetailResponseSchema, {
    data: request,
    method: "PATCH",
    url: projectPath(slug, `/${encodeURIComponent(projectId)}`),
  });

  return response.project;
}

async function deleteProject(
  slug: string,
  projectId: string,
  request: DeleteProjectRequest,
): Promise<void> {
  await requestVoid({
    data: request,
    method: "DELETE",
    url: projectPath(slug, `/${encodeURIComponent(projectId)}`),
  });
}

async function listEligibleAssignees(
  slug: string,
  projectId: string,
  params: { cursor?: string; ids?: string; limit?: number; q?: string },
): Promise<EligibleAssigneeListResponse> {
  return requestParsed(eligibleAssigneeListResponseSchema, {
    method: "GET",
    params: {
      ...(params.cursor === undefined ? {} : { cursor: params.cursor }),
      ...(params.ids === undefined ? {} : { ids: params.ids }),
      ...(params.limit === undefined ? {} : { limit: params.limit }),
      ...(params.q === undefined || params.q.length === 0 ? {} : { q: params.q }),
    },
    url: projectPath(slug, `/${encodeURIComponent(projectId)}/assignees`),
  });
}

async function listProjectMembers(slug: string, projectId: string): Promise<ProjectMember[]> {
  const response = await requestParsed(projectMemberListResponseSchema, {
    method: "GET",
    url: projectPath(slug, `/${encodeURIComponent(projectId)}/members`),
  });

  return response.members;
}

async function setProjectMember(
  slug: string,
  projectId: string,
  memberId: string,
  role: ProjectRole,
): Promise<void> {
  await requestVoid({
    data: { role },
    method: "PUT",
    url: projectPath(
      slug,
      `/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
    ),
  });
}

async function removeProjectMember(
  slug: string,
  projectId: string,
  memberId: string,
): Promise<void> {
  await requestVoid({
    method: "DELETE",
    url: projectPath(
      slug,
      `/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
    ),
  });
}

export {
  createProject,
  deleteProject,
  listEligibleAssignees,
  listProjectMembers,
  listProjects,
  removeProjectMember,
  setProjectMember,
  updateProject,
};
