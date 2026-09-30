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

const issueListFacetCountsSchema = z.record(z.string(), z.number().int().min(0));

const issueListFacetsSchema = z.object({
  assignee: issueListFacetCountsSchema,
  category: issueListFacetCountsSchema,
  priority: issueListFacetCountsSchema,
  status: issueListFacetCountsSchema,
});

/*
 * Raw query strings for `GET .../issues`. The service parses them into a
 * filter. Absent fields mean "do not filter", which is what the board sends.
 */
const issueListQuerySchema = z.object({
  assignee: z.string().max(4_000).optional(),
  category: z.string().max(200).optional(),
  created: z.string().max(40).optional(),
  description: z.string().max(200).optional(),
  facets: z.literal("1").optional(),
  number: z.string().max(40).optional(),
  priority: z.string().max(200).optional(),
  q: z.string().max(140).optional(),
  status: z.string().max(4_000).optional(),
  timeZone: z.string().max(100).optional(),
  title: z.string().max(140).optional(),
  updated: z.string().max(40).optional(),
});

const issueListResponseSchema = z.object({
  facets: issueListFacetsSchema.optional(),
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

const deleteIssuesRequestSchema = z
  .object({
    issueIds: z.array(z.uuid()).min(1).max(ISSUE_BOARD_MAX),
  })
  .transform((value) => ({
    issueIds: [...new Set(value.issueIds)],
  }));

const createIssuesRequestSchema = z.object({
  issues: z.array(createIssueRequestSchema).min(1).max(ISSUE_BOARD_MAX),
});

const createIssuesResponseSchema = z.object({
  issues: z.array(issueSummarySchema),
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

type CreateIssuesRequest = z.infer<typeof createIssuesRequestSchema>;
type CreateIssuesResponse = z.infer<typeof createIssuesResponseSchema>;
type DeleteIssuesRequest = z.infer<typeof deleteIssuesRequestSchema>;
type CreateIssueRequest = z.infer<typeof createIssueRequestSchema>;
type CreateProjectStatusRequest = z.infer<typeof createProjectStatusRequestSchema>;
type IssueListFacets = z.infer<typeof issueListFacetsSchema>;
type IssueListQuery = z.infer<typeof issueListQuerySchema>;
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
  createIssuesRequestSchema,
  createIssuesResponseSchema,
  deleteIssuesRequestSchema,
  createProjectStatusRequestSchema,
  issueListFacetsSchema,
  issueListQuerySchema,
  issueListResponseSchema,
  issueResponseSchema,
  issueSummarySchema,
  projectStatusListResponseSchema,
  projectStatusResponseSchema,
  projectStatusSummarySchema,
  updateIssueRequestSchema,
  updateProjectStatusRequestSchema,
  type CreateIssueRequest,
  type CreateIssuesRequest,
  type CreateIssuesResponse,
  type DeleteIssuesRequest,
  type CreateProjectStatusRequest,
  type IssueListFacets,
  type IssueListQuery,
  type IssueListResponse,
  type IssueResponse,
  type IssueSummary,
  type ProjectStatusListResponse,
  type ProjectStatusResponse,
  type ProjectStatusSummary,
  type UpdateIssueRequest,
  type UpdateProjectStatusRequest,
};
