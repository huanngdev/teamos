import { z } from "zod";

import {
  issueViewDefinitionSchema,
  type IssueViewAssigneeFilter,
  type IssueViewDefinition,
  type IssueViewFilters,
  type IssueViewVisibility,
} from "../contracts/issue-view.js";
import type { IssueListQuery } from "../contracts/issue.js";
import {
  currentUserAssigneeId,
  isCalendarDateKey,
  isSupportedTimeZone,
  parseIssueListQuery,
  unassignedAssigneeId,
  type IssueListFilters,
} from "./issue-list-query.js";
import {
  getIssuePriorityLabel,
  getIssueStatusCategoryLabel,
  issuePriorities,
  issueStatusCategories,
} from "./issue-workflow.js";

const issueViewVisibilityLabels: Record<IssueViewVisibility, string> = {
  personal: "Personal",
  project: "Project",
};

interface IssueViewActor {
  actorMemberId: string;
  canUpdateProject: boolean;
  canViewProject: boolean;
}

interface IssueViewRecordAccess extends IssueViewActor {
  ownerMemberId: string | null;
  visibility: IssueViewVisibility;
}

interface IssueViewReferenceSets {
  memberIds: readonly string[];
  statusIds: readonly string[];
}

interface IssueViewFilterNames {
  memberName?: (memberId: string) => string | undefined;
  statusName?: (statusId: string) => string | undefined;
}

function getIssueViewVisibilityLabel(visibility: IssueViewVisibility): string {
  return issueViewVisibilityLabels[visibility];
}

function canCreateIssueView(visibility: IssueViewVisibility, actor: IssueViewActor): boolean {
  if (!actor.canViewProject) {
    return false;
  }

  return visibility === "personal" || actor.canUpdateProject;
}

function canReadIssueView(access: IssueViewRecordAccess): boolean {
  if (!access.canViewProject) {
    return false;
  }

  if (access.visibility === "project") {
    return true;
  }

  return access.ownerMemberId !== null && access.ownerMemberId === access.actorMemberId;
}

function canManageIssueView(access: IssueViewRecordAccess): boolean {
  if (!canReadIssueView(access)) {
    return false;
  }

  if (access.visibility === "personal") {
    return true;
  }

  return access.canUpdateProject;
}

/*
 * The list endpoint only returns the caller's personal views, so the client can
 * gate those controls without receiving another member's id. The server still
 * checks ownership on every mutation.
 */
function canManageListedIssueView(
  visibility: IssueViewVisibility,
  actor: Pick<IssueViewActor, "canUpdateProject" | "canViewProject">,
): boolean {
  if (!actor.canViewProject) {
    return false;
  }

  return visibility === "personal" || actor.canUpdateProject;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function uniqueInOrder<T extends string>(values: readonly T[], order: readonly T[]): T[] {
  const selected = new Set(values);

  return order.filter((value) => selected.has(value));
}

function range(
  from: string | number | undefined,
  to: string | number | undefined,
): string | undefined {
  if (from === undefined && to === undefined) {
    return undefined;
  }

  return `${from ?? ""}..${to ?? ""}`;
}

function assigneeTokens(assignee: IssueViewAssigneeFilter | undefined): string | undefined {
  if (assignee === undefined) {
    return undefined;
  }

  const tokens = [...assignee.memberIds];

  if (assignee.includeUnassigned) {
    tokens.push(unassignedAssigneeId);
  }

  if (assignee.includeCurrentUser) {
    tokens.push(currentUserAssigneeId);
  }

  return tokens.length === 0 ? undefined : tokens.join(",");
}

function assertDateRange(
  context: z.RefinementCtx,
  from: string | undefined,
  to: string | undefined,
  path: string,
): void {
  if (from !== undefined && !isCalendarDateKey(from)) {
    context.addIssue({ code: "custom", message: "Enter a real date.", path: [path, "from"] });
  }

  if (to !== undefined && !isCalendarDateKey(to)) {
    context.addIssue({ code: "custom", message: "Enter a real date.", path: [path, "to"] });
  }

  if (from !== undefined && to !== undefined && from > to) {
    context.addIssue({
      code: "custom",
      message: "The start date is after the end date.",
      path: [path],
    });
  }
}

function canonicalizeAssignee(
  assignee: IssueViewAssigneeFilter | undefined,
): IssueViewAssigneeFilter | undefined {
  if (assignee === undefined) {
    return undefined;
  }

  const canonical = {
    includeCurrentUser: assignee.includeCurrentUser,
    includeUnassigned: assignee.includeUnassigned,
    memberIds: uniqueSorted(assignee.memberIds),
  };

  if (
    !canonical.includeCurrentUser &&
    !canonical.includeUnassigned &&
    canonical.memberIds.length === 0
  ) {
    return undefined;
  }

  return canonical;
}

function canonicalizeFilters(filters: IssueViewFilters): IssueViewFilters {
  const assignee = canonicalizeAssignee(filters.assignee);
  const categories = uniqueInOrder(filters.categories ?? [], issueStatusCategories);
  const priorities = uniqueInOrder(filters.priorities ?? [], issuePriorities);
  const statusIds = uniqueSorted(filters.statusIds ?? []);

  return {
    ...(assignee === undefined ? {} : { assignee }),
    ...(categories.length === 0 ? {} : { categories }),
    ...(filters.createdFrom === undefined ? {} : { createdFrom: filters.createdFrom }),
    ...(filters.createdTo === undefined ? {} : { createdTo: filters.createdTo }),
    ...(filters.description === undefined ? {} : { description: filters.description }),
    ...(filters.numberMax === undefined ? {} : { numberMax: filters.numberMax }),
    ...(filters.numberMin === undefined ? {} : { numberMin: filters.numberMin }),
    ...(priorities.length === 0 ? {} : { priorities }),
    ...(filters.q === undefined ? {} : { q: filters.q }),
    ...(statusIds.length === 0 ? {} : { statusIds }),
    timeZone: filters.timeZone,
    ...(filters.title === undefined ? {} : { title: filters.title }),
    ...(filters.updatedFrom === undefined ? {} : { updatedFrom: filters.updatedFrom }),
    ...(filters.updatedTo === undefined ? {} : { updatedTo: filters.updatedTo }),
  };
}

function normalizeIssueViewDefinition(input: unknown): IssueViewDefinition {
  const parsed = issueViewDefinitionSchema
    .superRefine((definition, context) => {
      if (!isSupportedTimeZone(definition.filters.timeZone)) {
        context.addIssue({
          code: "custom",
          message: "Choose a valid time zone.",
          path: ["filters", "timeZone"],
        });
      }

      assertDateRange(
        context,
        definition.filters.createdFrom,
        definition.filters.createdTo,
        "created",
      );
      assertDateRange(
        context,
        definition.filters.updatedFrom,
        definition.filters.updatedTo,
        "updated",
      );

      if (
        definition.filters.numberMin !== undefined &&
        definition.filters.numberMax !== undefined &&
        definition.filters.numberMin > definition.filters.numberMax
      ) {
        context.addIssue({
          code: "custom",
          message: "The first number is higher than the last number.",
          path: ["filters", "numberMin"],
        });
      }
    })
    .parse(input);

  return {
    filters: canonicalizeFilters(parsed.filters),
    version: 1,
  };
}

function emptyIssueViewDefinition(timeZone: string): IssueViewDefinition {
  return normalizeIssueViewDefinition({
    filters: { timeZone },
    version: 1,
  });
}

function issueViewToListQuery(definition: IssueViewDefinition): IssueListQuery {
  const filters = definition.filters;

  return {
    assignee: assigneeTokens(filters.assignee),
    category: filters.categories?.join(","),
    created: range(filters.createdFrom, filters.createdTo),
    description: filters.description,
    number: range(filters.numberMin, filters.numberMax),
    priority: filters.priorities?.join(","),
    q: filters.q,
    status: filters.statusIds?.join(","),
    timeZone: filters.timeZone,
    title: filters.title,
    updated: range(filters.updatedFrom, filters.updatedTo),
  };
}

function issueViewDefinitionFromFilters(filters: IssueListFilters): IssueViewDefinition {
  const assignee =
    filters.includeCurrentUser || filters.includeUnassigned || filters.assignees.length > 0
      ? {
          includeCurrentUser: filters.includeCurrentUser,
          includeUnassigned: filters.includeUnassigned,
          memberIds: filters.assignees,
        }
      : undefined;

  return normalizeIssueViewDefinition({
    filters: {
      assignee,
      categories: filters.categories,
      createdFrom: filters.createdFrom,
      createdTo: filters.createdTo,
      description: filters.description,
      numberMax: filters.numberMax,
      numberMin: filters.numberMin,
      priorities: filters.priorities,
      q: filters.q,
      statusIds: filters.statusIds,
      timeZone: filters.timeZone,
      title: filters.title,
      updatedFrom: filters.updatedFrom,
      updatedTo: filters.updatedTo,
    },
    version: 1,
  });
}

function issueViewDefinitionsEqual(left: IssueViewDefinition, right: IssueViewDefinition): boolean {
  return (
    JSON.stringify(normalizeIssueViewDefinition(left)) ===
    JSON.stringify(normalizeIssueViewDefinition(right))
  );
}

function issueListQueryFromDefinition(definition: IssueViewDefinition): IssueListFilters {
  return parseIssueListQuery(issueViewToListQuery(definition));
}

function findStaleIssueViewReferences(
  definition: IssueViewDefinition,
  known: IssueViewReferenceSets,
): { memberIds: string[]; statusIds: string[] } {
  const members = new Set(known.memberIds);
  const statuses = new Set(known.statusIds);

  return {
    memberIds: (definition.filters.assignee?.memberIds ?? []).filter(
      (memberId) => !members.has(memberId),
    ),
    statusIds: (definition.filters.statusIds ?? []).filter((statusId) => !statuses.has(statusId)),
  };
}

function namedValue(value: string | undefined, fallback: string): string {
  return value ?? fallback;
}

function describeIssueViewFilters(
  definition: IssueViewDefinition,
  names: IssueViewFilterNames = {},
): string[] {
  const filters = definition.filters;
  const summary: string[] = [];
  const assignee = filters.assignee;

  if (assignee?.includeCurrentUser) {
    summary.push("Assigned to me");
  }

  for (const memberId of assignee?.memberIds ?? []) {
    summary.push(`Assigned to ${namedValue(names.memberName?.(memberId), "Unknown member")}`);
  }

  if (assignee?.includeUnassigned) {
    summary.push("Unassigned");
  }

  for (const priority of filters.priorities ?? []) {
    summary.push(getIssuePriorityLabel(priority));
  }

  for (const category of filters.categories ?? []) {
    summary.push(getIssueStatusCategoryLabel(category));
  }

  for (const statusId of filters.statusIds ?? []) {
    summary.push(namedValue(names.statusName?.(statusId), "Unknown status"));
  }

  if (filters.q !== undefined) {
    summary.push(`Search: ${filters.q}`);
  }

  if (filters.title !== undefined) {
    summary.push(`Title: ${filters.title}`);
  }

  if (filters.description !== undefined) {
    summary.push(`Description: ${filters.description}`);
  }

  if (filters.numberMin !== undefined || filters.numberMax !== undefined) {
    summary.push(`Number: ${filters.numberMin ?? ""}–${filters.numberMax ?? ""}`);
  }

  if (filters.createdFrom !== undefined || filters.createdTo !== undefined) {
    summary.push(`Created: ${filters.createdFrom ?? ""}–${filters.createdTo ?? ""}`);
  }

  if (filters.updatedFrom !== undefined || filters.updatedTo !== undefined) {
    summary.push(`Updated: ${filters.updatedFrom ?? ""}–${filters.updatedTo ?? ""}`);
  }

  return summary;
}

function hasIssueViewFilters(definition: IssueViewDefinition): boolean {
  return describeIssueViewFilters(definition).length > 0;
}

export {
  canCreateIssueView,
  canManageIssueView,
  canManageListedIssueView,
  canReadIssueView,
  describeIssueViewFilters,
  emptyIssueViewDefinition,
  findStaleIssueViewReferences,
  getIssueViewVisibilityLabel,
  hasIssueViewFilters,
  issueListQueryFromDefinition,
  issueViewDefinitionFromFilters,
  issueViewDefinitionsEqual,
  issueViewToListQuery,
  issueViewVisibilityLabels,
  normalizeIssueViewDefinition,
  type IssueViewActor,
  type IssueViewFilterNames,
  type IssueViewRecordAccess,
};
