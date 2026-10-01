import { z } from "zod";

import { searchTermSchema } from "../utilities/search.js";
import { issuePrioritySchema, issueStatusCategorySchema } from "../utilities/issue-workflow.js";

const ISSUE_VIEW_LIST_DEFAULT_LIMIT = 50;
const ISSUE_VIEW_LIST_MAX_LIMIT = 100;
const ISSUE_VIEW_NAME_MAX = 80;

const issueViewVisibilitySchema = z.enum(["personal", "project"]);

const issueViewNameSchema = z.string().trim().min(1).max(ISSUE_VIEW_NAME_MAX);

const issueViewAssigneeFilterSchema = z.strictObject({
  includeCurrentUser: z.boolean(),
  includeUnassigned: z.boolean(),
  memberIds: z.array(z.string().trim().min(1).max(128)).max(50),
});

const issueViewDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const issueViewFiltersSchema = z.strictObject({
  assignee: issueViewAssigneeFilterSchema.optional(),
  categories: z.array(issueStatusCategorySchema).max(5).optional(),
  createdFrom: issueViewDateSchema.optional(),
  createdTo: issueViewDateSchema.optional(),
  description: z.string().trim().min(1).max(200).optional(),
  numberMax: z.number().int().min(1).optional(),
  numberMin: z.number().int().min(1).optional(),
  priorities: z.array(issuePrioritySchema).max(5).optional(),
  q: z.string().trim().min(1).max(140).optional(),
  statusIds: z.array(z.uuid()).max(50).optional(),
  timeZone: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(140).optional(),
  updatedFrom: issueViewDateSchema.optional(),
  updatedTo: issueViewDateSchema.optional(),
});

const issueViewDefinitionSchema = z.strictObject({
  filters: issueViewFiltersSchema,
  version: z.literal(1),
});

const issueViewSummarySchema = z.object({
  createdAt: z.iso.datetime(),
  definition: issueViewDefinitionSchema,
  id: z.uuid(),
  name: z.string().min(1),
  revision: z.number().int().min(1),
  updatedAt: z.iso.datetime(),
  visibility: issueViewVisibilitySchema,
});

const issueViewListQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ISSUE_VIEW_LIST_MAX_LIMIT)
    .default(ISSUE_VIEW_LIST_DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
  search: searchTermSchema.optional(),
});

const issueViewListResponseSchema = z.object({
  pagination: z.object({
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    total: z.number().int().min(0),
  }),
  views: z.array(issueViewSummarySchema),
});

const issueViewResponseSchema = z.object({
  view: issueViewSummarySchema,
});

const createIssueViewRequestSchema = z.object({
  definition: issueViewDefinitionSchema,
  name: issueViewNameSchema,
  visibility: issueViewVisibilitySchema,
});

const updateIssueViewRequestSchema = z
  .object({
    definition: issueViewDefinitionSchema.optional(),
    expectedRevision: z.number().int().min(1),
    name: issueViewNameSchema.optional(),
  })
  .refine((value) => value.definition !== undefined || value.name !== undefined, {
    message: "Change the name or the filters.",
  });

type CreateIssueViewRequest = z.infer<typeof createIssueViewRequestSchema>;
type IssueViewAssigneeFilter = z.infer<typeof issueViewAssigneeFilterSchema>;
type IssueViewDefinition = z.infer<typeof issueViewDefinitionSchema>;
type IssueViewFilters = z.infer<typeof issueViewFiltersSchema>;
type IssueViewListQuery = z.infer<typeof issueViewListQuerySchema>;
type IssueViewListResponse = z.infer<typeof issueViewListResponseSchema>;
type IssueViewResponse = z.infer<typeof issueViewResponseSchema>;
type IssueViewSummary = z.infer<typeof issueViewSummarySchema>;
type IssueViewVisibility = z.infer<typeof issueViewVisibilitySchema>;
type UpdateIssueViewRequest = z.infer<typeof updateIssueViewRequestSchema>;

export {
  ISSUE_VIEW_LIST_DEFAULT_LIMIT,
  ISSUE_VIEW_LIST_MAX_LIMIT,
  ISSUE_VIEW_NAME_MAX,
  createIssueViewRequestSchema,
  issueViewDefinitionSchema,
  issueViewListQuerySchema,
  issueViewListResponseSchema,
  issueViewResponseSchema,
  issueViewSummarySchema,
  issueViewVisibilitySchema,
  updateIssueViewRequestSchema,
  type CreateIssueViewRequest,
  type IssueViewAssigneeFilter,
  type IssueViewDefinition,
  type IssueViewFilters,
  type IssueViewListQuery,
  type IssueViewListResponse,
  type IssueViewResponse,
  type IssueViewSummary,
  type IssueViewVisibility,
  type UpdateIssueViewRequest,
};
