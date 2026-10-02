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

const eligibleAssigneeSchema = z.object({
  email: z.email(),
  id: z.string().min(1),
  image: z.string().nullable(),
  name: z.string(),
});

const eligibleAssigneeListQuerySchema = z.object({
  cursor: z.string().min(1).max(2_000).optional(),
  ids: z.string().max(2_000).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  q: z.string().max(80).optional(),
});

const eligibleAssigneeListResponseSchema = z.object({
  assignees: z.array(eligibleAssigneeSchema),
  nextCursor: z.string().nullable(),
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

/*
 * Deletion echoes the project name so the server can confirm the caller meant
 * this exact project, not one that was renamed in another tab. The value is
 * not trimmed: it must match the stored name character for character.
 */
const deleteProjectRequestSchema = z.object({
  confirmationName: z.string().min(1).max(80),
});

const setProjectMemberRequestSchema = z.object({
  memberId: z.string().min(1),
  role: projectRoleSchema.default("member"),
});

type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
type DeleteProjectRequest = z.infer<typeof deleteProjectRequestSchema>;
type ProjectDetailResponse = z.infer<typeof projectDetailResponseSchema>;
type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
type ProjectListResponse = z.infer<typeof projectListResponseSchema>;
type EligibleAssignee = z.infer<typeof eligibleAssigneeSchema>;
type EligibleAssigneeListQuery = z.infer<typeof eligibleAssigneeListQuerySchema>;
type EligibleAssigneeListResponse = z.infer<typeof eligibleAssigneeListResponseSchema>;
type ProjectMember = z.infer<typeof projectMemberSchema>;
type ProjectMemberListResponse = z.infer<typeof projectMemberListResponseSchema>;
type ProjectSlug = z.infer<typeof projectSlugSchema>;
type ProjectSummary = z.infer<typeof projectSummarySchema>;
type SetProjectMemberRequest = z.infer<typeof setProjectMemberRequestSchema>;
type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

export {
  createProjectRequestSchema,
  deleteProjectRequestSchema,
  eligibleAssigneeListQuerySchema,
  eligibleAssigneeListResponseSchema,
  eligibleAssigneeSchema,
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
  type DeleteProjectRequest,
  type EligibleAssignee,
  type EligibleAssigneeListQuery,
  type EligibleAssigneeListResponse,
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
