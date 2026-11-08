import {
  ISSUE_COLUMN_PAGE_SIZE,
  getIssueStatusCategoryLabel,
  issuePriorities,
  issuePriorityRank,
  issueStatusCategories,
  unassignedAssigneeId,
  type IssueListFacets,
  type IssueSortDirection,
  type IssueTableSort,
} from "@teamos/shared";
import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { issue, issueAssignee, member, projectStatus, user } from "../../schema/index.js";
import { issueStatusJoin } from "./filters.js";
import type { IssueReader, IssueRecord, StoredAssignee } from "./types.js";

const issueCardSelection = {
  createdAt: issue.createdAt,
  id: issue.id,
  number: issue.number,
  position: issue.position,
  priority: issue.priority,
  statusId: issue.statusId,
  title: issue.title,
  updatedAt: issue.updatedAt,
};

const issueListSelection = {
  ...issueCardSelection,
  contentText: issue.contentText,
};

const issueSelection = {
  ...issueListSelection,
  content: issue.content,
};

function issueCardQuery(executor: IssueReader) {
  return executor
    .select(issueCardSelection)
    .from(issue)
    .innerJoin(projectStatus, issueStatusJoin());
}

function issueListQuery(executor: IssueReader) {
  return executor
    .select(issueListSelection)
    .from(issue)
    .innerJoin(projectStatus, issueStatusJoin());
}

function issueQuery(executor: IssueReader) {
  return executor.select(issueSelection).from(issue).innerJoin(projectStatus, issueStatusJoin());
}

async function countIssues(
  executor: IssueReader,
  where: SQL | undefined,
): Promise<Array<{ value: number }>> {
  const [row] = await executor
    .select({ value: count(issue.id) })
    .from(issue)
    .innerJoin(projectStatus, issueStatusJoin())
    .where(where);

  return [{ value: Number(row?.value ?? 0) }];
}

async function countIssuesByStatus(
  executor: IssueReader,
  where: SQL | undefined,
): Promise<Array<{ statusId: string; value: number | string }>> {
  const rows = await executor
    .select({ statusId: issue.statusId, value: count() })
    .from(issue)
    .innerJoin(projectStatus, issueStatusJoin())
    .where(where)
    .groupBy(issue.statusId);

  return rows;
}

async function loadProjectStatusIds(
  executor: IssueReader,
  input: { organizationId: string; projectId: string },
): Promise<Array<{ id: string }>> {
  return executor
    .select({ id: projectStatus.id })
    .from(projectStatus)
    .where(
      and(
        eq(projectStatus.organizationId, input.organizationId),
        eq(projectStatus.projectId, input.projectId),
      ),
    )
    .orderBy(asc(projectStatus.position), asc(projectStatus.id));
}

async function loadAssignees(
  executor: IssueReader,
  organizationId: string,
  issueIds: readonly string[],
): Promise<Map<string, StoredAssignee[]>> {
  const grouped = new Map<string, StoredAssignee[]>();

  if (issueIds.length === 0) {
    return grouped;
  }

  const rows = await executor
    .select({
      email: user.email,
      id: member.id,
      image: user.image,
      issueId: issueAssignee.issueId,
      name: user.name,
    })
    .from(issueAssignee)
    .innerJoin(
      member,
      and(
        eq(issueAssignee.memberId, member.id),
        eq(issueAssignee.organizationId, member.organizationId),
      ),
    )
    .innerJoin(user, eq(member.userId, user.id))
    .where(
      and(
        eq(issueAssignee.organizationId, organizationId),
        inArray(issueAssignee.issueId, issueIds),
      ),
    )
    .orderBy(asc(sql`lower(${user.name})`), asc(member.id));

  for (const row of rows) {
    const current = grouped.get(row.issueId) ?? [];
    current.push({
      email: row.email,
      id: row.id,
      image: row.image,
      name: row.name,
    });
    grouped.set(row.issueId, current);
  }

  return grouped;
}

async function withAssignees<T extends { id: string }>(
  executor: IssueReader,
  organizationId: string,
  records: readonly T[],
): Promise<Array<T & { assignees: StoredAssignee[] }>> {
  const grouped = await loadAssignees(
    executor,
    organizationId,
    records.map((record) => record.id),
  );

  return records.map((record) => ({
    ...record,
    assignees: grouped.get(record.id) ?? [],
  }));
}

async function readIssue(
  executor: IssueReader,
  organizationId: string,
  projectId: string,
  issueId: string,
): Promise<IssueRecord | undefined> {
  const [record] = await issueQuery(executor)
    .where(
      and(
        eq(issue.organizationId, organizationId),
        eq(issue.projectId, projectId),
        eq(issue.id, issueId),
      ),
    )
    .limit(1);

  if (record === undefined) {
    return undefined;
  }

  const [hydrated] = await withAssignees(executor, organizationId, [record]);

  return hydrated;
}

async function readIssueByNumber(
  executor: IssueReader,
  organizationId: string,
  projectId: string,
  number: string,
): Promise<IssueRecord | undefined> {
  const [record] = await issueQuery(executor)
    .where(
      and(
        eq(issue.organizationId, organizationId),
        eq(issue.projectId, projectId),
        sql`${issue.number} = ${number}::bigint`,
      ),
    )
    .limit(1);

  if (record === undefined) {
    return undefined;
  }

  const [hydrated] = await withAssignees(executor, organizationId, [record]);

  return hydrated;
}

async function readIssueListPage(
  executor: IssueReader,
  input: {
    direction: IssueSortDirection;
    limit: number;
    offset: number;
    sort: IssueTableSort;
    where: SQL | undefined;
  },
) {
  return issueListQuery(executor)
    .where(input.where)
    .orderBy(...issueTableOrder(input.sort, input.direction))
    .limit(input.limit)
    .offset(input.offset);
}

async function readIssueBoardColumnRecords(
  executor: IssueReader,
  input: { statusId: string; where: SQL | undefined },
) {
  return issueCardQuery(executor)
    .where(and(input.where, eq(issue.statusId, input.statusId)))
    .orderBy(asc(issue.position), asc(issue.id))
    .limit(ISSUE_COLUMN_PAGE_SIZE + 1);
}

async function readIssueColumnRecords(
  executor: IssueReader,
  input: {
    before: boolean;
    cursor: { id: string; position: number } | undefined;
    limit: number;
    statusId: string;
    where: SQL | undefined;
  },
) {
  const comparison =
    input.cursor === undefined
      ? undefined
      : input.before
        ? sql`(${issue.position}, ${issue.id}) < (${input.cursor.position}::int, ${input.cursor.id}::uuid)`
        : sql`(${issue.position}, ${issue.id}) > (${input.cursor.position}::int, ${input.cursor.id}::uuid)`;

  return issueCardQuery(executor)
    .where(and(input.where, eq(issue.statusId, input.statusId), comparison))
    .orderBy(
      ...(input.before
        ? [desc(issue.position), desc(issue.id)]
        : [asc(issue.position), asc(issue.id)]),
    )
    .limit(input.limit + 1);
}

function directed(expression: SQL | PgColumn, direction: IssueSortDirection): SQL {
  return direction === "asc" ? asc(expression) : desc(expression);
}

function issueTableOrder(sort: IssueTableSort, direction: IssueSortDirection): SQL[] {
  const priorityRank = sql`case ${issue.priority} ${sql.join(
    issuePriorities.map((priority) => sql`when ${priority} then ${issuePriorityRank[priority]}`),
    sql` `,
  )} else 0 end`;
  const categoryLabel = sql`lower(case ${projectStatus.category} ${sql.join(
    issueStatusCategories.map(
      (category) => sql`when ${category} then ${getIssueStatusCategoryLabel(category)}`,
    ),
    sql` `,
  )} else ${projectStatus.category} end)`;
  const primary = (() => {
    switch (sort) {
      case "assignee":
        return directed(
          sql`coalesce((
            select min(lower(${user.name}))
            from ${issueAssignee}
            inner join ${member} on ${member.id} = ${issueAssignee.memberId}
              and ${member.organizationId} = ${issueAssignee.organizationId}
            inner join ${user} on ${user.id} = ${member.userId}
            where ${issueAssignee.issueId} = ${issue.id}
              and ${issueAssignee.organizationId} = ${issue.organizationId}
          ), '')`,
          direction,
        );
      case "category":
        return directed(categoryLabel, direction);
      case "createdAt":
        return directed(issue.createdAt, direction);
      case "content":
        return directed(sql`lower(${issue.contentText})`, direction);
      case "number":
        return directed(issue.number, direction);
      case "priority":
        return directed(priorityRank, direction);
      case "status":
        return directed(projectStatus.position, direction);
      case "title":
        return directed(sql`lower(${issue.title})`, direction);
      case "updatedAt":
        return directed(issue.updatedAt, direction);
      default: {
        const exhaustive: never = sort;

        return exhaustive;
      }
    }
  })();

  return [primary, asc(issue.id)];
}

function toFacetCounts(
  rows: readonly { id: string | null; value: number | string }[],
  nullKey?: string,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const row of rows) {
    const key = row.id ?? nullKey;

    if (key === undefined || key === null) {
      continue;
    }

    counts[key] = Number(row.value);
  }

  return counts;
}

async function loadIssueFacets(
  executor: IssueReader,
  organizationId: string,
  projectId: string,
): Promise<IssueListFacets> {
  const scope = and(eq(issue.organizationId, organizationId), eq(issue.projectId, projectId));
  const [statuses, priorities, assignees, unassigned, categories] = await Promise.all([
    executor
      .select({ id: issue.statusId, value: count() })
      .from(issue)
      .where(scope)
      .groupBy(issue.statusId),
    executor
      .select({ id: issue.priority, value: count() })
      .from(issue)
      .where(scope)
      .groupBy(issue.priority),
    executor
      .select({ id: issueAssignee.memberId, value: count() })
      .from(issueAssignee)
      .innerJoin(
        issue,
        and(
          eq(issueAssignee.issueId, issue.id),
          eq(issueAssignee.organizationId, issue.organizationId),
        ),
      )
      .where(scope)
      .groupBy(issueAssignee.memberId),
    executor
      .select({ value: count() })
      .from(issue)
      .where(
        and(
          scope,
          sql`not exists (
            select 1 from ${issueAssignee}
            where ${issueAssignee.issueId} = ${issue.id}
              and ${issueAssignee.organizationId} = ${issue.organizationId}
          )`,
        ),
      ),
    executor
      .select({ id: projectStatus.category, value: count() })
      .from(issue)
      .innerJoin(projectStatus, issueStatusJoin())
      .where(scope)
      .groupBy(projectStatus.category),
  ]);

  const assigneeCounts = toFacetCounts(assignees);
  const unassignedCount = Number(unassigned[0]?.value ?? 0);

  if (unassignedCount > 0) {
    assigneeCounts[unassignedAssigneeId] = unassignedCount;
  }

  return {
    assignee: assigneeCounts,
    category: toFacetCounts(categories),
    priority: toFacetCounts(priorities),
    status: toFacetCounts(statuses),
  };
}

export {
  countIssues,
  countIssuesByStatus,
  directed,
  issueCardQuery,
  issueListQuery,
  issueQuery,
  issueTableOrder,
  loadAssignees,
  loadIssueFacets,
  loadProjectStatusIds,
  readIssue,
  readIssueBoardColumnRecords,
  readIssueByNumber,
  readIssueColumnRecords,
  readIssueListPage,
  toFacetCounts,
  withAssignees,
};
