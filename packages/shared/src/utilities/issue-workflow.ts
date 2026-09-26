import { z } from "zod";

const ISSUE_BOARD_MAX = 200;
const ISSUE_POSITION_GAP = 1000;
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
  ISSUE_BOARD_MAX,
  ISSUE_POSITION_GAP,
  PROJECT_STATUS_MAX,
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
