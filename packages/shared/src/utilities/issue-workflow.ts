import { z } from "zod";

const ISSUE_ASSIGNEE_MAX = 20;
const ISSUE_BULK_DELETE_MAX = 200;
const ISSUE_COLUMN_PAGE_SIZE = 40;
const ISSUE_COLUMN_PAGE_MAX = 50;
const ISSUE_POSITION_GAP = 1000;
const ISSUE_POSITION_MAX = 2_147_483_647;
const ISSUE_POSITION_MIN = -2_147_483_648;
const ISSUE_TABLE_PAGE_MAX = 1_000_000;
const ISSUE_TABLE_PAGE_SIZE_DEFAULT = 20;
const ISSUE_TABLE_PAGE_SIZE_MAX = 50;
const PROJECT_STATUS_MAX = 20;

const issueStatusCategorySchema = z.enum([
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
]);

type IssueStatusCategory = z.infer<typeof issueStatusCategorySchema>;

const issueStatusCategories = issueStatusCategorySchema.options;

const issuePrioritySchema = z.enum(["none", "low", "medium", "high", "urgent"]);

type IssuePriority = z.infer<typeof issuePrioritySchema>;

const issuePriorities = issuePrioritySchema.options;

const issuePriorityRank: Record<IssuePriority, number> = {
  high: 3,
  low: 1,
  medium: 2,
  none: 0,
  urgent: 4,
};

/*
 * These records are the only display copy for coded issue values. A column
 * name is free-form and is not mapped here.
 */
const issueStatusCategoryLabels: Record<IssueStatusCategory, string> = {
  backlog: "Backlog",
  canceled: "Canceled",
  completed: "Completed",
  started: "Started",
  unstarted: "Unstarted",
};

const issuePriorityLabels: Record<IssuePriority, string> = {
  high: "High",
  low: "Low",
  medium: "Medium",
  none: "No priority",
  urgent: "Urgent",
};

function getIssuePriorityLabel(priority: IssuePriority): string {
  return issuePriorityLabels[priority];
}

function getIssueStatusCategoryLabel(category: IssueStatusCategory): string {
  return issueStatusCategoryLabels[category];
}

export {
  ISSUE_ASSIGNEE_MAX,
  ISSUE_BULK_DELETE_MAX,
  ISSUE_COLUMN_PAGE_MAX,
  ISSUE_COLUMN_PAGE_SIZE,
  ISSUE_POSITION_GAP,
  ISSUE_POSITION_MAX,
  ISSUE_POSITION_MIN,
  ISSUE_TABLE_PAGE_MAX,
  ISSUE_TABLE_PAGE_SIZE_DEFAULT,
  ISSUE_TABLE_PAGE_SIZE_MAX,
  PROJECT_STATUS_MAX,
  issuePriorityRank,
  getIssuePriorityLabel,
  getIssueStatusCategoryLabel,
  issuePriorities,
  issuePriorityLabels,
  issuePrioritySchema,
  issueStatusCategories,
  issueStatusCategoryLabels,
  issueStatusCategorySchema,
  type IssuePriority,
  type IssueStatusCategory,
};
