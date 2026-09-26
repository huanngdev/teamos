import { z } from "zod";

import {
  ISSUE_BOARD_MAX,
  issuePrioritySchema,
  issueStatusCategorySchema,
} from "../utilities/issue-workflow.js";

const issueStatusNameSchema = z.string().trim().min(1).max(40);
const issueTitleSchema = z.string().trim().min(1).max(140);
const issueDescriptionSchema = z.string().trim().max(5000);
const issueIndexSchema = z.number().int().min(0).max(ISSUE_BOARD_MAX);

const issueSummarySchema = z.object({
  assigneeMemberId: z.string().min(1).nullable(),
  createdAt: z.iso.datetime(),
  description: z.string().nullable(),
  id: z.string().min(1),
  number: z.number().int().min(1),
  position: z.number().int(),
  priority: issuePrioritySchema,
  statusId: z.uuid(),
  title: z.string().min(1),
  updatedAt: z.iso.datetime(),
});

const projectStatusSummarySchema = z.object({
  category: issueStatusCategorySchema,
  id: z.uuid(),
  isDefault: z.boolean(),
  name: z.string().min(1),
  position: z.number().int(),
});

const projectStatusListResponseSchema = z.object({
  statuses: z.array(projectStatusSummarySchema),
});

const projectStatusResponseSchema = z.object({
  status: projectStatusSummarySchema,
});

const issueListResponseSchema = z.object({
  issues: z.array(issueSummarySchema),
  total: z.number().int().min(0),
});

const issueResponseSchema = z.object({
  issue: issueSummarySchema,
});

const createIssueRequestSchema = z.object({
  assigneeMemberId: z.string().min(1).nullable().optional(),
  description: issueDescriptionSchema.optional(),
  priority: issuePrioritySchema.optional(),
  statusId: z.uuid().optional(),
  title: issueTitleSchema,
});

const updateIssueRequestSchema = z.object({
  assigneeMemberId: z.string().min(1).nullable().optional(),
  description: issueDescriptionSchema.nullable().optional(),
  index: issueIndexSchema.optional(),
  priority: issuePrioritySchema.optional(),
  statusId: z.uuid().optional(),
  title: issueTitleSchema.optional(),
});

const createProjectStatusRequestSchema = z.object({
  category: issueStatusCategorySchema,
  name: issueStatusNameSchema,
});

const updateProjectStatusRequestSchema = z.object({
  index: issueIndexSchema.optional(),
  name: issueStatusNameSchema.optional(),
});

type CreateIssueRequest = z.infer<typeof createIssueRequestSchema>;
type CreateProjectStatusRequest = z.infer<typeof createProjectStatusRequestSchema>;
type IssueListResponse = z.infer<typeof issueListResponseSchema>;
type IssueResponse = z.infer<typeof issueResponseSchema>;
type IssueSummary = z.infer<typeof issueSummarySchema>;
type ProjectStatusListResponse = z.infer<typeof projectStatusListResponseSchema>;
type ProjectStatusResponse = z.infer<typeof projectStatusResponseSchema>;
type ProjectStatusSummary = z.infer<typeof projectStatusSummarySchema>;
type UpdateIssueRequest = z.infer<typeof updateIssueRequestSchema>;
type UpdateProjectStatusRequest = z.infer<typeof updateProjectStatusRequestSchema>;

export {
  createIssueRequestSchema,
  createProjectStatusRequestSchema,
  issueListResponseSchema,
  issueResponseSchema,
  issueSummarySchema,
  projectStatusListResponseSchema,
  projectStatusResponseSchema,
  projectStatusSummarySchema,
  updateIssueRequestSchema,
  updateProjectStatusRequestSchema,
  type CreateIssueRequest,
  type CreateProjectStatusRequest,
  type IssueListResponse,
  type IssueResponse,
  type IssueSummary,
  type ProjectStatusListResponse,
  type ProjectStatusResponse,
  type ProjectStatusSummary,
  type UpdateIssueRequest,
  type UpdateProjectStatusRequest,
};
