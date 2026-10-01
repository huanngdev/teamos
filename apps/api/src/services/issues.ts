import type { Database } from "@teamos/db";
import { issue, member, projectStatus, user } from "@teamos/db/schema";
import {
  ISSUE_COLUMN_PAGE_SIZE,
  ISSUE_TABLE_PAGE_SIZE_DEFAULT,
  canPerformProjectAction,
  canonicalIssueColumnScope,
  encodeIssueColumnCursor,
  getIssuePriorityLabel,
  getIssueStatusCategoryLabel,
  issuePriorities,
  issuePriorityRank,
  issuePrioritySchema,
  issueStatusCategories,
  parseIssueListQuery,
  resolveCurrentUserAssignee,
  unassignedAssigneeId,
  type CreateIssueRequest,
  type DeleteIssuesRequest,
  type IssueBoardResponse,
  type IssueCardSummary,
  type IssueColumnPageResponse,
  type IssueListFacets,
  type IssueListFilters,
  type IssueListResponse,
  type IssueSortDirection,
  type IssueSummary,
  type IssueTableSort,
  type OrganizationMember,
  type ProjectVisibility,
  type UpdateIssueRequest,
} from "@teamos/shared";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  max,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import type { OrganizationAccess } from "@/auth/index.js";
import { AppError } from "@/errors/index.js";
import { lockIssueColumns, lockIssueNumbers, placeRelative } from "@/services/issue-placement.js";
import { buildLiteralSearchCondition } from "@/services/search.js";
import {
  assertActorAccessAfterLock,
  assertProjectAction,
  createProjectAccess,
  findProjectRole,
  lockProjectShare,
  type ProjectTransaction,
} from "@/services/project-access.js";

interface IssueMemberLookup {
  findMember: (input: {
    memberId: string;
    organizationId: string;
  }) => Promise<OrganizationMember | undefined>;
}

interface IssueService {
  clearAssignees: (input: { memberId: string; organizationId: string }) => Promise<void>;
  create: (input: {
    organization: OrganizationAccess;
    projectId: string;
    request: CreateIssueRequest;
  }) => Promise<IssueSummary>;
  get: (input: {
    issueId: string;
    organization: OrganizationAccess;
    projectId: string;
  }) => Promise<IssueSummary>;
  list: (input: {
    direction?: IssueSortDirection;
    filters?: IssueListFilters;
    organization: OrganizationAccess;
    page?: number;
    pageSize?: number;
    projectId: string;
    sort?: IssueTableSort;
  }) => Promise<IssueListResponse>;
  listBoard: (input: {
    filters?: IssueListFilters;
    organization: OrganizationAccess;
    projectId: string;
  }) => Promise<IssueBoardResponse>;
  listColumn: (input: {
    before: boolean;
    cursor: { id: string; position: number; scope: string; statusId: string } | undefined;
    filters?: IssueListFilters;
    limit: number;
    organization: OrganizationAccess;
    projectId: string;
    statusId: string;
  }) => Promise<IssueColumnPageResponse>;
  remove: (input: {
    organization: OrganizationAccess;
    projectId: string;
    issueId: string;
  }) => Promise<void>;
  removeMany: (input: {
    organization: OrganizationAccess;
    projectId: string;
    request: DeleteIssuesRequest;
  }) => Promise<void>;
  update: (input: {
    issueId: string;
    organization: OrganizationAccess;
    projectId: string;
    request: UpdateIssueRequest;
  }) => Promise<IssueSummary>;
}

interface IssueRecord {
  assigneeEmail: string | null;
  assigneeImage: string | null;
  assigneeMemberId: string | null;
  assigneeName: string | null;
  createdAt: Date;
  description?: string | null;
  id: string;
  number: number;
  position: number;
  priority: string;
  statusId: string;
  title: string;
  updatedAt: Date;
}

const issueCardSelection = {
  assigneeEmail: user.email,
  assigneeImage: user.image,
  assigneeMemberId: issue.assigneeMemberId,
  assigneeName: user.name,
  createdAt: issue.createdAt,
  id: issue.id,
  number: issue.number,
  position: issue.position,
  priority: issue.priority,
  statusId: issue.statusId,
  title: issue.title,
  updatedAt: issue.updatedAt,
};

const issueSelection = {
  ...issueCardSelection,
  description: issue.description,
};

type IssueReader = Pick<Database, "select">;

function assigneeJoin(): SQL | undefined {
  return and(
    eq(issue.assigneeMemberId, member.id),
    eq(issue.organizationId, member.organizationId),
  );
}

function issueStatusJoin(): SQL | undefined {
  return and(
    eq(issue.statusId, projectStatus.id),
    eq(issue.projectId, projectStatus.projectId),
    eq(issue.organizationId, projectStatus.organizationId),
  );
}

function dateBounds(
  column: PgColumn,
  timeZone: string,
  from: string | undefined,
  to: string | undefined,
): SQL | undefined {
  const bounds: SQL[] = [];

  if (from !== undefined) {
    bounds.push(sql`(${column} at time zone ${timeZone})::date >= ${from}::date`);
  }

  if (to !== undefined) {
    bounds.push(sql`(${column} at time zone ${timeZone})::date <= ${to}::date`);
  }

  if (bounds.length === 0) {
    return undefined;
  }

  return bounds.length === 1 ? bounds[0] : and(...bounds);
}

function buildIssueSearch(needle: string | undefined): SQL | undefined {
  if (needle === undefined) {
    return undefined;
  }

  const lowered = needle.toLowerCase();
  const matches: SQL[] = [
    sql`position(${lowered} in lower(${issue.title})) > 0`,
    sql`position(${lowered} in lower(coalesce(${issue.description}, ''))) > 0`,
    sql`position(${lowered} in ('#' || ${issue.number}::text)) > 0`,
    sql`position(${lowered} in lower(${projectStatus.name})) > 0`,
    sql`position(${lowered} in lower(${projectStatus.category})) > 0`,
    sql`position(${lowered} in lower(${issue.priority})) > 0`,
    sql`position(${lowered} in lower(coalesce(${user.name}, ''))) > 0`,
    sql`position(${lowered} in lower(coalesce(${user.email}, ''))) > 0`,
  ];
  const priorityLabels = issuePriorities.filter((priority) =>
    getIssuePriorityLabel(priority).toLowerCase().includes(lowered),
  );
  const categoryLabels = issueStatusCategories.filter((category) =>
    getIssueStatusCategoryLabel(category).toLowerCase().includes(lowered),
  );

  if (priorityLabels.length > 0) {
    matches.push(inArray(issue.priority, priorityLabels));
  }

  if (categoryLabels.length > 0) {
    matches.push(inArray(projectStatus.category, categoryLabels));
  }

  return sql`(${sql.join(matches, sql` or `)})`;
}

function buildIssueListWhere(
  organizationId: string,
  projectId: string,
  filters: IssueListFilters,
): SQL | undefined {
  const scope = and(eq(issue.organizationId, organizationId), eq(issue.projectId, projectId));

  /*
   * An unresolved `me` token is not "no assignee filter". Closing it avoids
   * showing every issue when a caller forgets to resolve the current member.
   */
  if (filters.unsatisfiable || filters.includeCurrentUser) {
    return and(scope, sql`false`);
  }

  const assigneeMatch =
    filters.includeUnassigned || filters.assignees.length > 0
      ? or(
          filters.includeUnassigned ? isNull(issue.assigneeMemberId) : undefined,
          filters.assignees.length > 0
            ? inArray(issue.assigneeMemberId, filters.assignees)
            : undefined,
        )
      : undefined;

  return and(
    scope,
    filters.statusIds.length > 0 ? inArray(issue.statusId, filters.statusIds) : undefined,
    filters.priorities.length > 0 ? inArray(issue.priority, filters.priorities) : undefined,
    filters.categories.length > 0 ? inArray(projectStatus.category, filters.categories) : undefined,
    assigneeMatch,
    filters.numberMin === undefined ? undefined : gte(issue.number, filters.numberMin),
    filters.numberMax === undefined ? undefined : lte(issue.number, filters.numberMax),
    buildLiteralSearchCondition([issue.title], filters.title),
    buildLiteralSearchCondition([issue.description], filters.description),
    dateBounds(issue.createdAt, filters.timeZone, filters.createdFrom, filters.createdTo),
    dateBounds(issue.updatedAt, filters.timeZone, filters.updatedFrom, filters.updatedTo),
    buildIssueSearch(filters.q),
  );
}

function issueCardQuery(executor: IssueReader) {
  return executor
    .select(issueCardSelection)
    .from(issue)
    .innerJoin(projectStatus, issueStatusJoin())
    .leftJoin(member, assigneeJoin())
    .leftJoin(user, eq(member.userId, user.id));
}

function issueQuery(executor: IssueReader) {
  return executor
    .select(issueSelection)
    .from(issue)
    .innerJoin(projectStatus, issueStatusJoin())
    .leftJoin(member, assigneeJoin())
    .leftJoin(user, eq(member.userId, user.id));
}

async function countIssues(
  executor: IssueReader,
  where: SQL | undefined,
): Promise<Array<{ value: number }>> {
  const [row] = await executor
    .select({ value: count(issue.id) })
    .from(issue)
    .innerJoin(projectStatus, issueStatusJoin())
    .leftJoin(member, assigneeJoin())
    .leftJoin(user, eq(member.userId, user.id))
    .where(where);

  return [{ value: Number(row?.value ?? 0) }];
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

  return record;
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
        return directed(sql`lower(coalesce(${user.name}, ''))`, direction);
      case "category":
        return directed(categoryLabel, direction);
      case "createdAt":
        return directed(issue.createdAt, direction);
      case "description":
        return directed(sql`lower(coalesce(${issue.description}, ''))`, direction);
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
  db: Database,
  organizationId: string,
  projectId: string,
): Promise<IssueListFacets> {
  const scope = and(eq(issue.organizationId, organizationId), eq(issue.projectId, projectId));
  const [statuses, priorities, assignees, categories] = await Promise.all([
    db
      .select({ id: issue.statusId, value: count() })
      .from(issue)
      .where(scope)
      .groupBy(issue.statusId),
    db
      .select({ id: issue.priority, value: count() })
      .from(issue)
      .where(scope)
      .groupBy(issue.priority),
    db
      .select({ id: issue.assigneeMemberId, value: count() })
      .from(issue)
      .where(scope)
      .groupBy(issue.assigneeMemberId),
    db
      .select({ id: projectStatus.category, value: count() })
      .from(issue)
      .innerJoin(projectStatus, issueStatusJoin())
      .where(scope)
      .groupBy(projectStatus.category),
  ]);

  return {
    assignee: toFacetCounts(assignees, unassignedAssigneeId),
    category: toFacetCounts(categories),
    priority: toFacetCounts(priorities),
    status: toFacetCounts(statuses),
  };
}

function createIssueService(dependencies: {
  db: Database;
  members: IssueMemberLookup;
}): IssueService {
  const { db, members } = dependencies;
  const access = createProjectAccess(db);

  function toIssueCard(record: IssueRecord): IssueCardSummary {
    const priority = issuePrioritySchema.safeParse(record.priority);

    if (!priority.success) {
      throw new AppError(500, "INTERNAL_SERVER_ERROR", "The issue could not be loaded.");
    }

    return {
      assignee:
        record.assigneeMemberId === null ||
        record.assigneeEmail === null ||
        record.assigneeName === null
          ? null
          : {
              email: record.assigneeEmail,
              image: record.assigneeImage,
              name: record.assigneeName,
            },
      assigneeMemberId: record.assigneeMemberId,
      createdAt: record.createdAt.toISOString(),
      id: record.id,
      number: record.number,
      position: record.position,
      priority: priority.data,
      statusId: record.statusId,
      title: record.title,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  function toIssueSummary(record: IssueRecord): IssueSummary {
    return {
      ...toIssueCard(record),
      description: record.description ?? null,
    };
  }

  async function requireIssueFilters(
    organization: OrganizationAccess,
    projectId: string,
    rawFilters: IssueListFilters | undefined,
  ): Promise<IssueListFilters> {
    const resolved = await access.resolveProject({
      actorMemberId: organization.memberId,
      organizationId: organization.organizationId,
      organizationRole: organization.role,
      projectId,
    });

    assertProjectAction(resolved.access, "view");

    return resolveCurrentUserAssignee(rawFilters ?? parseIssueListQuery({}), organization.memberId);
  }

  function columnPage(
    filters: IssueListFilters,
    records: readonly IssueRecord[],
    statusId: string,
    total: number,
  ) {
    const hasMore = records.length > ISSUE_COLUMN_PAGE_SIZE;
    const pageRecords = hasMore ? records.slice(0, ISSUE_COLUMN_PAGE_SIZE) : [...records];
    const bound = pageRecords[pageRecords.length - 1];
    const scope = canonicalIssueColumnScope(statusId, filters);

    return {
      hasMore,
      issues: pageRecords.map(toIssueCard),
      nextCursor:
        hasMore && bound !== undefined
          ? encodeIssueColumnCursor({
              id: bound.id,
              position: bound.position,
              scope,
              statusId,
              v: 1 as const,
            })
          : null,
      scope,
      statusId,
      total,
    };
  }

  async function requireAssignee(
    transaction: ProjectTransaction,
    input: {
      assigneeMemberId: string;
      organizationId: string;
      projectId: string;
      visibility: ProjectVisibility;
    },
  ): Promise<void> {
    const target = await members.findMember({
      memberId: input.assigneeMemberId,
      organizationId: input.organizationId,
    });

    if (target === undefined) {
      throw new AppError(404, "MEMBER_NOT_FOUND", "The member was not found in this workspace.");
    }

    const projectRole = await findProjectRole(
      transaction,
      input.organizationId,
      input.projectId,
      input.assigneeMemberId,
    );

    if (
      !canPerformProjectAction("view", {
        organizationRole: target.role,
        projectRole: projectRole ?? null,
        visibility: input.visibility,
      })
    ) {
      throw new AppError(404, "MEMBER_NOT_FOUND", "The member was not found in this workspace.");
    }
  }

  return {
    clearAssignees: async ({ memberId, organizationId }) => {
      /*
       * The assignee foreign key is RESTRICT, so this write must commit before
       * Better Auth deletes the member row. A later gateway failure leaves the
       * member in place with their assignments already cleared.
       */
      await clearIssueAssignees(db, { memberId, organizationId });
    },
    create: async ({ organization, projectId, request }) => {
      const resolved = await access.resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });
      assertProjectAction(resolved.access, "create-issue");

      try {
        const created = await db.transaction(async (transaction) => {
          const locked = await lockProjectShare(
            transaction,
            organization.organizationId,
            projectId,
          );
          await assertActorAccessAfterLock(
            transaction,
            organization,
            projectId,
            locked.visibility,
            "create-issue",
          );
          await lockIssueNumbers(transaction, projectId);

          const statusId = await resolveCreateStatusId(transaction, {
            organizationId: organization.organizationId,
            projectId,
            statusId: request.statusId,
          });
          await lockIssueColumns(transaction, projectId, [statusId]);

          if (request.assigneeMemberId != null) {
            await requireAssignee(transaction, {
              assigneeMemberId: request.assigneeMemberId,
              organizationId: organization.organizationId,
              projectId,
              visibility: resolved.access.visibility,
            });
          }

          const [maxNumber] = await transaction
            .select({ value: max(issue.number) })
            .from(issue)
            .where(
              and(
                eq(issue.organizationId, organization.organizationId),
                eq(issue.projectId, projectId),
              ),
            );
          const position = await placeRelative(transaction, {
            organizationId: organization.organizationId,
            placement: { type: "start" },
            projectId,
            statusId,
          });
          const [inserted] = await transaction
            .insert(issue)
            .values({
              assigneeMemberId: request.assigneeMemberId ?? null,
              createdByMemberId: organization.memberId,
              description: request.description ?? null,
              number: (maxNumber?.value ?? 0) + 1,
              organizationId: organization.organizationId,
              position,
              priority: request.priority ?? "none",
              projectId,
              statusId,
              title: request.title,
              updatedByMemberId: organization.memberId,
            })
            .returning({ id: issue.id });

          if (inserted === undefined) {
            throw new AppError(500, "INTERNAL_SERVER_ERROR", "The issue could not be created.");
          }

          const record = await readIssue(
            transaction,
            organization.organizationId,
            projectId,
            inserted.id,
          );

          if (record === undefined) {
            throw new AppError(500, "INTERNAL_SERVER_ERROR", "The issue could not be created.");
          }

          return record;
        });

        return toIssueSummary(created);
      } catch (error) {
        throw mapIssueWriteError(error);
      }
    },
    get: async ({ issueId, organization, projectId }) => {
      const resolved = await access.resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });
      assertProjectAction(resolved.access, "view");
      const record = await readIssue(db, organization.organizationId, projectId, issueId);

      if (record === undefined) {
        throw new AppError(404, "ISSUE_NOT_FOUND", "The issue was not found.");
      }

      return toIssueSummary(record);
    },
    list: async ({
      direction = "desc",
      filters: rawFilters,
      organization,
      page = 1,
      pageSize = ISSUE_TABLE_PAGE_SIZE_DEFAULT,
      projectId,
      sort = "createdAt",
    }) => {
      const resolved = await access.resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });
      assertProjectAction(resolved.access, "view");
      const filters = resolveCurrentUserAssignee(
        rawFilters ?? parseIssueListQuery({}),
        organization.memberId,
      );
      const where = buildIssueListWhere(organization.organizationId, projectId, filters);
      /*
       * Offset paging is intentional for numbered pages. A deep page still
       * walks the skipped rows, so latency grows with the offset.
       */
      const offset = (page - 1) * pageSize;
      const [records, [total], facets] = await Promise.all([
        issueQuery(db)
          .where(where)
          .orderBy(...issueTableOrder(sort, direction))
          .limit(pageSize)
          .offset(offset),
        countIssues(db, where),
        filters.includeFacets
          ? loadIssueFacets(db, organization.organizationId, projectId)
          : Promise.resolve(undefined),
      ]);
      const totalValue = total?.value ?? 0;

      return {
        ...(facets === undefined ? {} : { facets }),
        issues: records.map(toIssueSummary),
        page,
        pageCount: totalValue === 0 ? 0 : Math.ceil(totalValue / pageSize),
        pageSize,
        total: totalValue,
      };
    },
    listBoard: async ({ filters: rawFilters, organization, projectId }) => {
      const filters = await requireIssueFilters(organization, projectId, rawFilters);
      const where = buildIssueListWhere(organization.organizationId, projectId, filters);
      const [statuses, counts] = await Promise.all([
        db
          .select({ id: projectStatus.id })
          .from(projectStatus)
          .where(
            and(
              eq(projectStatus.organizationId, organization.organizationId),
              eq(projectStatus.projectId, projectId),
            ),
          )
          .orderBy(asc(projectStatus.position), asc(projectStatus.id)),
        db
          .select({ statusId: issue.statusId, value: count() })
          .from(issue)
          .innerJoin(projectStatus, issueStatusJoin())
          .leftJoin(member, assigneeJoin())
          .leftJoin(user, eq(member.userId, user.id))
          .where(where)
          .groupBy(issue.statusId),
      ]);
      const totals = new Map(counts.map((row) => [row.statusId, Number(row.value)]));
      const pages = await Promise.all(
        statuses.map(async (status) => {
          const records = await issueCardQuery(db)
            .where(and(where, eq(issue.statusId, status.id)))
            .orderBy(asc(issue.position), asc(issue.id))
            .limit(ISSUE_COLUMN_PAGE_SIZE + 1);

          return columnPage(filters, records, status.id, totals.get(status.id) ?? 0);
        }),
      );

      return { columns: pages };
    },
    listColumn: async ({
      before,
      cursor,
      filters: rawFilters,
      limit,
      organization,
      projectId,
      statusId,
    }) => {
      const filters = await requireIssueFilters(organization, projectId, rawFilters);
      const scope = canonicalIssueColumnScope(statusId, filters);

      if (cursor !== undefined && (cursor.scope !== scope || cursor.statusId !== statusId)) {
        throw new AppError(400, "VALIDATION_ERROR", "The page cursor does not match this column.");
      }

      const where = buildIssueListWhere(organization.organizationId, projectId, filters);
      const comparison =
        cursor === undefined
          ? undefined
          : before
            ? sql`(${issue.position}, ${issue.id}) < (${cursor.position}::int, ${cursor.id}::uuid)`
            : sql`(${issue.position}, ${issue.id}) > (${cursor.position}::int, ${cursor.id}::uuid)`;
      const records = await issueCardQuery(db)
        .where(and(where, eq(issue.statusId, statusId), comparison))
        .orderBy(
          ...(before
            ? [desc(issue.position), desc(issue.id)]
            : [asc(issue.position), asc(issue.id)]),
        )
        .limit(limit + 1);
      const hasMore = records.length > limit;
      const pageRecords = (hasMore ? records.slice(0, limit) : records).slice();

      if (before) {
        pageRecords.reverse();
      }

      const bound = before ? pageRecords[0] : pageRecords[pageRecords.length - 1];

      return {
        hasMore,
        issues: pageRecords.map(toIssueCard),
        nextCursor:
          hasMore && bound !== undefined
            ? encodeIssueColumnCursor({
                id: bound.id,
                position: bound.position,
                scope,
                statusId,
                v: 1,
              })
            : null,
      };
    },
    removeMany: async ({ organization, projectId, request }) => {
      const issueIds = request.issueIds;
      const resolved = await access.resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });
      assertProjectAction(resolved.access, "delete-issue");

      await db.transaction(async (transaction) => {
        const locked = await lockProjectShare(transaction, organization.organizationId, projectId);
        await assertActorAccessAfterLock(
          transaction,
          organization,
          projectId,
          locked.visibility,
          "delete-issue",
        );

        const existing = await transaction
          .select({ id: issue.id })
          .from(issue)
          .where(
            and(
              eq(issue.organizationId, organization.organizationId),
              eq(issue.projectId, projectId),
              inArray(issue.id, issueIds),
            ),
          )
          .for("update");

        if (existing.length !== issueIds.length) {
          throw new AppError(404, "ISSUE_NOT_FOUND", "The issue was not found.");
        }

        await transaction
          .delete(issue)
          .where(
            and(
              eq(issue.organizationId, organization.organizationId),
              eq(issue.projectId, projectId),
              inArray(issue.id, issueIds),
            ),
          );
      });
    },
    remove: async ({ issueId, organization, projectId }) => {
      const resolved = await access.resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });
      assertProjectAction(resolved.access, "delete-issue");

      await db.transaction(async (transaction) => {
        const locked = await lockProjectShare(transaction, organization.organizationId, projectId);
        await assertActorAccessAfterLock(
          transaction,
          organization,
          projectId,
          locked.visibility,
          "delete-issue",
        );

        const [existing] = await transaction
          .select({ id: issue.id })
          .from(issue)
          .where(
            and(
              eq(issue.organizationId, organization.organizationId),
              eq(issue.projectId, projectId),
              eq(issue.id, issueId),
            ),
          )
          .for("update")
          .limit(1);

        if (existing === undefined) {
          throw new AppError(404, "ISSUE_NOT_FOUND", "The issue was not found.");
        }

        await transaction
          .delete(issue)
          .where(
            and(
              eq(issue.organizationId, organization.organizationId),
              eq(issue.projectId, projectId),
              eq(issue.id, issueId),
            ),
          );
      });
    },
    update: async ({ issueId, organization, projectId, request }) => {
      const resolved = await access.resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });
      assertProjectAction(resolved.access, "update-issue");

      try {
        const updated = await db.transaction(async (transaction) => {
          const locked = await lockProjectShare(
            transaction,
            organization.organizationId,
            projectId,
          );
          await assertActorAccessAfterLock(
            transaction,
            organization,
            projectId,
            locked.visibility,
            "update-issue",
          );
          const [preview] = await transaction
            .select({ statusId: issue.statusId })
            .from(issue)
            .where(
              and(
                eq(issue.organizationId, organization.organizationId),
                eq(issue.projectId, projectId),
                eq(issue.id, issueId),
              ),
            )
            .limit(1);

          if (preview === undefined) {
            throw new AppError(404, "ISSUE_NOT_FOUND", "The issue was not found.");
          }

          const requestedStatusId = request.statusId ?? preview.statusId;

          if (request.placement !== undefined || requestedStatusId !== preview.statusId) {
            await lockIssueColumns(transaction, projectId, [preview.statusId, requestedStatusId]);
          }

          const [existing] = await transaction
            .select({
              position: issue.position,
              statusId: issue.statusId,
              updatedAt: issue.updatedAt,
            })
            .from(issue)
            .where(
              and(
                eq(issue.organizationId, organization.organizationId),
                eq(issue.projectId, projectId),
                eq(issue.id, issueId),
              ),
            )
            .for("update")
            .limit(1);

          if (existing === undefined) {
            throw new AppError(404, "ISSUE_NOT_FOUND", "The issue was not found.");
          }

          if (
            request.expectedUpdatedAt !== undefined &&
            existing.updatedAt.toISOString() !== request.expectedUpdatedAt
          ) {
            throw new AppError(
              409,
              "ISSUE_REVISION_CONFLICT",
              "The issue changed. Refresh and try again.",
            );
          }

          const statusId = request.statusId ?? existing.statusId;
          const shouldPlace = request.placement !== undefined || statusId !== existing.statusId;

          if (shouldPlace && existing.statusId !== preview.statusId) {
            throw new AppError(
              409,
              "ISSUE_PLACEMENT_CONFLICT",
              "The issue moved. Refresh and try again.",
            );
          }

          const position = shouldPlace
            ? await placeRelative(transaction, {
                excludeId: issueId,
                organizationId: organization.organizationId,
                placement: request.placement ?? { type: "start" },
                projectId,
                statusId,
              })
            : existing.position;

          if (request.assigneeMemberId != null) {
            await requireAssignee(transaction, {
              assigneeMemberId: request.assigneeMemberId,
              organizationId: organization.organizationId,
              projectId,
              visibility: resolved.access.visibility,
            });
          }

          const [saved] = await transaction
            .update(issue)
            .set({
              ...(request.assigneeMemberId === undefined
                ? {}
                : { assigneeMemberId: request.assigneeMemberId }),
              ...(request.description === undefined ? {} : { description: request.description }),
              ...(request.priority === undefined ? {} : { priority: request.priority }),
              ...(request.title === undefined ? {} : { title: request.title }),
              position,
              statusId,
              updatedByMemberId: organization.memberId,
            })
            .where(
              and(
                eq(issue.organizationId, organization.organizationId),
                eq(issue.projectId, projectId),
                eq(issue.id, issueId),
              ),
            )
            .returning({ id: issue.id });

          if (saved === undefined) {
            throw new AppError(404, "ISSUE_NOT_FOUND", "The issue was not found.");
          }

          const record = await readIssue(
            transaction,
            organization.organizationId,
            projectId,
            saved.id,
          );

          if (record === undefined) {
            throw new AppError(404, "ISSUE_NOT_FOUND", "The issue was not found.");
          }

          return record;
        });

        return toIssueSummary(updated);
      } catch (error) {
        throw mapIssueWriteError(error);
      }
    },
  };
}

async function clearIssueAssignees(
  executor: Pick<Database, "update">,
  input: { memberId: string; organizationId: string; projectId?: string },
): Promise<void> {
  const conditions = [
    eq(issue.organizationId, input.organizationId),
    eq(issue.assigneeMemberId, input.memberId),
  ];

  if (input.projectId !== undefined) {
    conditions.push(eq(issue.projectId, input.projectId));
  }

  await executor
    .update(issue)
    .set({ assigneeMemberId: null })
    .where(and(...conditions));
}

async function resolveCreateStatusId(
  transaction: ProjectTransaction,
  input: { organizationId: string; projectId: string; statusId: string | undefined },
): Promise<string> {
  const [record] = await transaction
    .select({ id: projectStatus.id })
    .from(projectStatus)
    .where(
      and(
        eq(projectStatus.organizationId, input.organizationId),
        eq(projectStatus.projectId, input.projectId),
        input.statusId === undefined
          ? eq(projectStatus.isDefault, true)
          : eq(projectStatus.id, input.statusId),
      ),
    )
    .for("update")
    .limit(1);

  if (record !== undefined) {
    return record.id;
  }

  if (input.statusId === undefined) {
    throw new AppError(500, "INTERNAL_SERVER_ERROR", "The project is missing its default column.");
  }

  throw new AppError(404, "PROJECT_STATUS_NOT_FOUND", "The column was not found.");
}

function mapIssueWriteError(error: unknown): unknown {
  if (error instanceof AppError) {
    return error;
  }

  const databaseError = readDatabaseError(error);

  if (databaseError.code === "23505") {
    return new AppError(500, "INTERNAL_SERVER_ERROR", "The issue could not be saved.");
  }

  if (databaseError.code === "23503") {
    return new AppError(404, "MEMBER_NOT_FOUND", "The member was not found in this workspace.");
  }

  return error;
}

function readDatabaseError(error: unknown, depth = 0): { code?: string } {
  if (depth > 4 || typeof error !== "object" || error === null) {
    return {};
  }

  const record = error as { cause?: unknown; code?: unknown };

  if (typeof record.code === "string") {
    return { code: record.code };
  }

  return readDatabaseError(record.cause, depth + 1);
}

export { clearIssueAssignees, createIssueService, type IssueService };
