import { z } from "zod";

import type { IssueListQuery } from "../contracts/issue.js";
import {
  issuePrioritySchema,
  issueStatusCategorySchema,
  type IssuePriority,
  type IssueStatusCategory,
} from "./issue-workflow.js";

const currentUserAssigneeId = "me";
const unassignedAssigneeId = "unassigned";
const issueListFilterLimit = 50;

interface IssueListFilters {
  assignees: string[];
  categories: IssueStatusCategory[];
  createdFrom: string | undefined;
  createdTo: string | undefined;
  description: string | undefined;
  includeCurrentUser: boolean;
  includeFacets: boolean;
  includeUnassigned: boolean;
  numberMax: number | undefined;
  numberMin: number | undefined;
  priorities: IssuePriority[];
  q: string | undefined;
  statusIds: string[];
  timeZone: string;
  title: string | undefined;
  unsatisfiable: boolean;
  updatedFrom: string | undefined;
  updatedTo: string | undefined;
}

function isCalendarDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === (month ?? 1) - 1 &&
    date.getUTCDate() === day
  );
}

function isSupportedTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });

    return true;
  } catch {
    return false;
  }
}

function parseList(value: string | undefined): string[] {
  if (value === undefined || value.length === 0) {
    return [];
  }

  const seen = new Set<string>();

  return value.split(",").flatMap((item) => {
    const trimmed = item.trim();

    if (trimmed.length === 0 || seen.has(trimmed) || seen.size >= issueListFilterLimit) {
      return [];
    }

    seen.add(trimmed);

    return [trimmed];
  });
}

function parseRange(
  value: string | undefined,
): [string | undefined, string | undefined] | undefined {
  if (value === undefined || value.length === 0) {
    return undefined;
  }

  const parts = value.split("..");

  if (parts.length !== 2) {
    return undefined;
  }

  const from = parts[0] ?? "";
  const to = parts[1] ?? "";

  return [from.length === 0 ? undefined : from, to.length === 0 ? undefined : to];
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

function parseText(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.trim() ?? "";

  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.slice(0, max);
}

/*
 * `me` is resolved to the caller's organization member id at request time.
 * Leaving it unresolved must not be treated as "no assignee filter".
 */
function resolveCurrentUserAssignee(filters: IssueListFilters, memberId: string): IssueListFilters {
  if (!filters.includeCurrentUser || memberId.length === 0) {
    return filters;
  }

  return {
    ...filters,
    assignees: filters.assignees.includes(memberId)
      ? filters.assignees
      : [...filters.assignees, memberId],
    includeCurrentUser: false,
  };
}

function parseIssueListQuery(input: IssueListQuery): IssueListFilters {
  let unsatisfiable = false;
  const statusIds = parseList(input.status).filter((value) => z.uuid().safeParse(value).success);

  if ((input.status?.trim().length ?? 0) > 0 && statusIds.length === 0) {
    unsatisfiable = true;
  }

  const priorityTokens = parseList(input.priority);
  const priorities = priorityTokens.flatMap((value) => {
    const parsed = issuePrioritySchema.safeParse(value);

    return parsed.success ? [parsed.data] : [];
  });

  if (priorityTokens.length > 0 && priorities.length === 0) {
    unsatisfiable = true;
  }

  const categoryTokens = parseList(input.category);
  const categories = categoryTokens.flatMap((value) => {
    const parsed = issueStatusCategorySchema.safeParse(value);

    return parsed.success ? [parsed.data] : [];
  });

  if (categoryTokens.length > 0 && categories.length === 0) {
    unsatisfiable = true;
  }

  const assigneeTokens = parseList(input.assignee);
  const includeCurrentUser = assigneeTokens.includes(currentUserAssigneeId);
  const includeUnassigned = assigneeTokens.includes(unassignedAssigneeId);
  const assignees = assigneeTokens.filter(
    (value) => value !== unassignedAssigneeId && value !== currentUserAssigneeId,
  );
  const number = parseRange(input.number);
  const numberMin = parsePositiveInteger(number?.[0]);
  const numberMax = parsePositiveInteger(number?.[1]);
  const created = parseRange(input.created);
  const updated = parseRange(input.updated);
  const timeZone =
    input.timeZone !== undefined && isSupportedTimeZone(input.timeZone) ? input.timeZone : "UTC";

  return {
    assignees,
    categories,
    createdFrom:
      created?.[0] !== undefined && isCalendarDateKey(created[0]) ? created[0] : undefined,
    createdTo: created?.[1] !== undefined && isCalendarDateKey(created[1]) ? created[1] : undefined,
    description: parseText(input.description, 200),
    includeCurrentUser,
    includeFacets: input.facets === "1",
    includeUnassigned,
    numberMax,
    numberMin,
    priorities,
    q: parseText(input.q, 140),
    statusIds,
    timeZone,
    title: parseText(input.title, 140),
    unsatisfiable,
    updatedFrom:
      updated?.[0] !== undefined && isCalendarDateKey(updated[0]) ? updated[0] : undefined,
    updatedTo: updated?.[1] !== undefined && isCalendarDateKey(updated[1]) ? updated[1] : undefined,
  };
}

export {
  currentUserAssigneeId,
  isCalendarDateKey,
  isSupportedTimeZone,
  parseIssueListQuery,
  resolveCurrentUserAssignee,
  unassignedAssigneeId,
  type IssueListFilters,
};
