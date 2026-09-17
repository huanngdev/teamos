import { z } from "zod";

import { projectRoleSchema, projectVisibilitySchema } from "../utilities/project-roles.js";
import { searchQuerySchema } from "../utilities/search.js";

const projectSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(48)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain lowercase letters, numbers, and hyphens.",
  );

const projectSummarySchema = z.object({
  createdAt: z.iso.datetime(),
  description: z.string().nullable(),
  id: z.string().min(1),
  memberCount: z.number().int().min(0),
  name: z.string().min(1),
  /*
   * The requesting member's project role. `null` means they only have the
   * implicit access granted by a workspace-visible project.
   */
  role: projectRoleSchema.nullable(),
  slug: projectSlugSchema,
  updatedAt: z.iso.datetime(),
  visibility: projectVisibilitySchema,
});

const projectMemberSchema = z.object({
  email: z.email(),
  image: z.string().nullable(),
  memberId: z.string().min(1),
  name: z.string(),
  role: projectRoleSchema,
  userId: z.string().min(1),
});

const projectListQuerySchema = searchQuerySchema;

const projectListResponseSchema = z.object({
  projects: z.array(projectSummarySchema),
});

const projectDetailResponseSchema = z.object({
  project: projectSummarySchema,
});

const projectMemberListResponseSchema = z.object({
  members: z.array(projectMemberSchema),
});

const createProjectRequestSchema = z.object({
  description: z.string().trim().max(500).optional(),
  name: z.string().trim().min(1).max(80),
  slug: projectSlugSchema,
  visibility: projectVisibilitySchema.default("workspace"),
});

const updateProjectRequestSchema = z.object({
  description: z.string().trim().max(500).nullable().optional(),
  name: z.string().trim().min(1).max(80).optional(),
  visibility: projectVisibilitySchema.optional(),
});

const setProjectMemberRequestSchema = z.object({
  memberId: z.string().min(1),
  role: projectRoleSchema.default("member"),
});

type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
type ProjectDetailResponse = z.infer<typeof projectDetailResponseSchema>;
type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
type ProjectListResponse = z.infer<typeof projectListResponseSchema>;
type ProjectMember = z.infer<typeof projectMemberSchema>;
type ProjectMemberListResponse = z.infer<typeof projectMemberListResponseSchema>;
type ProjectSlug = z.infer<typeof projectSlugSchema>;
type ProjectSummary = z.infer<typeof projectSummarySchema>;
type SetProjectMemberRequest = z.infer<typeof setProjectMemberRequestSchema>;
type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

export {
  createProjectRequestSchema,
  projectDetailResponseSchema,
  projectListQuerySchema,
  projectListResponseSchema,
  projectMemberListResponseSchema,
  projectMemberSchema,
  projectSlugSchema,
  projectSummarySchema,
  setProjectMemberRequestSchema,
  updateProjectRequestSchema,
  type CreateProjectRequest,
  type ProjectDetailResponse,
  type ProjectListResponse,
  type ProjectListQuery,
  type ProjectMember,
  type ProjectMemberListResponse,
  type ProjectSlug,
  type ProjectSummary,
  type SetProjectMemberRequest,
  type UpdateProjectRequest,
};
