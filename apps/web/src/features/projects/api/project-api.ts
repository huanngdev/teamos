import {
  projectDetailResponseSchema,
  projectListResponseSchema,
  projectMemberListResponseSchema,
  type CreateProjectRequest,
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

async function deleteProject(slug: string, projectId: string): Promise<void> {
  await requestVoid({
    method: "DELETE",
    url: projectPath(slug, `/${encodeURIComponent(projectId)}`),
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
  listProjectMembers,
  listProjects,
  removeProjectMember,
  setProjectMember,
  updateProject,
};
