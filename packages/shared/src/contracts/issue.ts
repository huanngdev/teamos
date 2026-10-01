import { z } from "zod";

import {
  ISSUE_BULK_DELETE_MAX,
  ISSUE_COLUMN_PAGE_MAX,
  ISSUE_COLUMN_PAGE_SIZE,
  ISSUE_TABLE_PAGE_MAX,
  ISSUE_TABLE_PAGE_SIZE_DEFAULT,
  ISSUE_TABLE_PAGE_SIZE_MAX,
  PROJECT_STATUS_MAX,
  issuePrioritySchema,
  issueStatusCategorySchema,
} from "../utilities/issue-workflow.js";

const issueStatusNameSchema = z.string().trim().min(1).max(40);
const issueTitleSchema = z.string().trim().min(1).max(140);
const issueDescriptionSchema = z.string().trim().max(5000);
const projectStatusIndexSchema = z.number().int().min(0).max(PROJECT_STATUS_MAX);

const issueAssigneeSchema = z.object({
  email: z.email(),
  image: z.string().nullable(),
  name: z.string(),
});

const issueCardSchema = z.object({
  assignee: issueAssigneeSchema.nullable(),
  assigneeMemberId: z.string().min(1).nullable(),
  createdAt: z.iso.datetime(),
  id: z.string().min(1),
  number: z.number().int().min(1),
  position: z.number().int(),
  priority: issuePrioritySchema,
  statusId: z.uuid(),
  title: z.string().min(1),
  updatedAt: z.iso.datetime(),
});

const issueSummarySchema = issueCardSchema.extend({
  description: z.string().nullable(),
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

const issueTableSortSchema = z.enum([
  "assignee",
  "category",
  "createdAt",
  "description",
  "number",
  "priority",
  "status",
  "title",
  "updatedAt",
]);

const issueSortDirectionSchema = z.enum(["asc", "desc"]);

const issueTableQuerySchema = issueListQuerySchema.extend({
  direction: issueSortDirectionSchema.default("desc"),
  page: z.coerce.number().int().min(1).max(ISSUE_TABLE_PAGE_MAX).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(ISSUE_TABLE_PAGE_SIZE_MAX)
    .default(ISSUE_TABLE_PAGE_SIZE_DEFAULT),
  sort: issueTableSortSchema.default("createdAt"),
});

const issueListResponseSchema = z.object({
  facets: issueListFacetsSchema.optional(),
  issues: z.array(issueSummarySchema),
  page: z.number().int().min(1),
  pageCount: z.number().int().min(0),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});

const issueColumnQuerySchema = issueListQuerySchema.extend({
  before: z.literal("1").optional(),
  cursor: z.string().min(1).max(8_000).optional(),
  limit: z.coerce.number().int().min(1).max(ISSUE_COLUMN_PAGE_MAX).default(ISSUE_COLUMN_PAGE_SIZE),
});

const issueColumnPageSchema = z.object({
  hasMore: z.boolean(),
  issues: z.array(issueCardSchema),
  nextCursor: z.string().nullable(),
  scope: z.string().min(1).max(4_000),
  statusId: z.uuid(),
  total: z.number().int().min(0),
});

const issueBoardResponseSchema = z.object({
  columns: z.array(issueColumnPageSchema),
});

const issueColumnPageResponseSchema = z.object({
  hasMore: z.boolean(),
  issues: z.array(issueCardSchema),
  nextCursor: z.string().nullable(),
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

const issuePlacementSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("end") }),
  z.object({ anchorIssueId: z.uuid(), type: z.literal("before") }),
  z.object({ anchorIssueId: z.uuid(), type: z.literal("after") }),
]);

const deleteIssuesRequestSchema = z
  .object({
    issueIds: z.array(z.uuid()).min(1).max(ISSUE_BULK_DELETE_MAX),
  })
  .transform((value) => ({
    issueIds: [...new Set(value.issueIds)],
  }));

const updateIssueRequestSchema = z.object({
  assigneeMemberId: z.string().min(1).nullable().optional(),
  description: issueDescriptionSchema.nullable().optional(),
  expectedUpdatedAt: z.iso.datetime().optional(),
  placement: issuePlacementSchema.optional(),
  priority: issuePrioritySchema.optional(),
  statusId: z.uuid().optional(),
  title: issueTitleSchema.optional(),
});

const createProjectStatusRequestSchema = z.object({
  category: issueStatusCategorySchema,
  name: issueStatusNameSchema,
});

const updateProjectStatusRequestSchema = z.object({
  index: projectStatusIndexSchema.optional(),
  name: issueStatusNameSchema.optional(),
});

type DeleteIssuesRequest = z.infer<typeof deleteIssuesRequestSchema>;
type CreateIssueRequest = z.infer<typeof createIssueRequestSchema>;
type CreateProjectStatusRequest = z.infer<typeof createProjectStatusRequestSchema>;
type IssueBoardResponse = z.infer<typeof issueBoardResponseSchema>;
type IssueCardSummary = z.infer<typeof issueCardSchema>;
type IssueColumnPageResponse = z.infer<typeof issueColumnPageResponseSchema>;
type IssueColumnQuery = z.infer<typeof issueColumnQuerySchema>;
type IssueListFacets = z.infer<typeof issueListFacetsSchema>;
type IssueListQuery = z.infer<typeof issueListQuerySchema>;
type IssueListResponse = z.infer<typeof issueListResponseSchema>;
type IssuePlacement = z.infer<typeof issuePlacementSchema>;
type IssueResponse = z.infer<typeof issueResponseSchema>;
type IssueSortDirection = z.infer<typeof issueSortDirectionSchema>;
type IssueSummary = z.infer<typeof issueSummarySchema>;
type IssueTableQuery = z.infer<typeof issueTableQuerySchema>;
type IssueTableSort = z.infer<typeof issueTableSortSchema>;
type ProjectStatusListResponse = z.infer<typeof projectStatusListResponseSchema>;
type ProjectStatusResponse = z.infer<typeof projectStatusResponseSchema>;
type ProjectStatusSummary = z.infer<typeof projectStatusSummarySchema>;
type UpdateIssueRequest = z.infer<typeof updateIssueRequestSchema>;
type UpdateProjectStatusRequest = z.infer<typeof updateProjectStatusRequestSchema>;

export {
  createIssueRequestSchema,
  deleteIssuesRequestSchema,
  createProjectStatusRequestSchema,
  issueBoardResponseSchema,
  issueCardSchema,
  issueColumnPageResponseSchema,
  issueColumnQuerySchema,
  issueListFacetsSchema,
  issueListQuerySchema,
  issueListResponseSchema,
  issuePlacementSchema,
  issueResponseSchema,
  issueSummarySchema,
  issueTableQuerySchema,
  projectStatusListResponseSchema,
  projectStatusResponseSchema,
  projectStatusSummarySchema,
  updateIssueRequestSchema,
  updateProjectStatusRequestSchema,
  type CreateIssueRequest,
  type DeleteIssuesRequest,
  type CreateProjectStatusRequest,
  type IssueBoardResponse,
  type IssueCardSummary,
  type IssueColumnPageResponse,
  type IssueColumnQuery,
  type IssueListFacets,
  type IssueListQuery,
  type IssueListResponse,
  type IssuePlacement,
  type IssueResponse,
  type IssueSortDirection,
  type IssueSummary,
  type IssueTableQuery,
  type IssueTableSort,
  type ProjectStatusListResponse,
  type ProjectStatusResponse,
  type ProjectStatusSummary,
  type UpdateIssueRequest,
  type UpdateProjectStatusRequest,
};
