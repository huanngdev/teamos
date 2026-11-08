import type { Database } from "@teamos/db";
import {
  allocateIssueNumber,
  buildIssueListWhere,
  clearIssueAssignees,
  countIssues,
  countIssuesByStatus,
  deleteIssue,
  deleteIssueAssignees,
  deleteIssues,
  findCreateStatusForUpdate,
  findIssueForUpdate,
  findIssuesForUpdate,
  findIssueStatusForUpdate,
  findIssueWriteTargetForUpdate,
  insertIssue,
  insertIssueAssignees,
  loadIssueFacets,
  loadProjectStatusIds,
  readIssue,
  readIssueBoardColumnRecords,
  readIssueByNumber,
  readIssueColumnRecords,
  readIssueListPage,
  updateIssue,
  withAssignees,
  type IssueRecord,
} from "@teamos/db/repositories";
import {
  ISSUE_COLUMN_PAGE_SIZE,
  ISSUE_TABLE_PAGE_SIZE_DEFAULT,
  canPerformProjectAction,
  canonicalIssueColumnScope,
  encodeIssueColumnCursor,
  issueContentDocumentSchema,
  issueContentExcerpt,
  issuePrioritySchema,
  parseIssueListQuery,
  prepareIssueContent,
  resolveCurrentUserAssignee,
  type CreateIssueRequest,
  type DeleteIssuesRequest,
  type IssueBoardResponse,
  type IssueCardSummary,
  type IssueContentDocument,
  type IssueDetail,
  type IssueColumnPageResponse,
  type IssueListFilters,
  type IssueListResponse,
  type IssueSortDirection,
  type IssueSummary,
  type IssueTableSort,
  type OrganizationMember,
  type ProjectVisibility,
  type UpdateIssueRequest,
} from "@teamos/shared";

import type { OrganizationAccess } from "@/auth/index.js";
import { AppError } from "@/errors/index.js";
import { lockIssueColumns, lockIssueNumbers, placeRelative } from "@/services/issue-placement.js";
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
  }) => Promise<IssueDetail>;
  get: (input: {
    issueId: string;
    organization: OrganizationAccess;
    projectId: string;
  }) => Promise<IssueDetail>;
  getByNumber: (input: {
    number: string;
    organization: OrganizationAccess;
    projectId: string;
  }) => Promise<IssueDetail>;
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
  }) => Promise<IssueDetail>;
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
      assignees: record.assignees,
      createdAt: record.createdAt.toISOString(),
      id: record.id,
      number: record.number.toString(),
      position: record.position,
      priority: priority.data,
      statusId: record.statusId,
      title: record.title,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  function storedContent(record: IssueRecord): IssueContentDocument | null {
    if (record.content == null) {
      return null;
    }

    const parsed = issueContentDocumentSchema.safeParse(record.content);

    if (!parsed.success) {
      throw new AppError(500, "INTERNAL_SERVER_ERROR", "The issue could not be loaded.");
    }

    return parsed.data;
  }

  function toIssueSummary(record: IssueRecord): IssueSummary {
    return {
      ...toIssueCard(record),
      contentText: issueContentExcerpt(record.contentText ?? ""),
    };
  }

  function toIssueDetail(record: IssueRecord): IssueDetail {
    return {
      ...toIssueCard(record),
      content: storedContent(record),
      contentText: record.contentText ?? "",
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

  async function requireAssignees(
    transaction: ProjectTransaction,
    input: {
      assigneeMemberIds: readonly string[];
      organizationId: string;
      projectId: string;
      visibility: ProjectVisibility;
    },
  ): Promise<void> {
    for (const memberId of input.assigneeMemberIds) {
      const target = await members.findMember({
        memberId,
        organizationId: input.organizationId,
      });

      if (target === undefined) {
        throw new AppError(404, "MEMBER_NOT_FOUND", "The member was not found in this workspace.");
      }

      const projectRole = await findProjectRole(
        transaction,
        input.organizationId,
        input.projectId,
        memberId,
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
          const allocation = await allocateIssueNumber(transaction, {
            organizationId: organization.organizationId,
            projectId,
          });

          if (allocation.kind === "exhausted") {
            throw new AppError(
              409,
              "ISSUE_NUMBER_EXHAUSTED",
              "This project has used every available issue number.",
            );
          }

          if (allocation.kind === "unavailable") {
            throw new AppError(500, "INTERNAL_SERVER_ERROR", "The issue could not be created.");
          }

          const statusId = await resolveCreateStatusId(transaction, {
            organizationId: organization.organizationId,
            projectId,
            statusId: request.statusId,
          });
          await lockIssueColumns(transaction, projectId, [statusId]);

          if (request.assigneeMemberIds !== undefined) {
            await requireAssignees(transaction, {
              assigneeMemberIds: request.assigneeMemberIds,
              organizationId: organization.organizationId,
              projectId,
              visibility: resolved.access.visibility,
            });
          }

          const position = await placeRelative(transaction, {
            organizationId: organization.organizationId,
            placement: { type: "start" },
            projectId,
            statusId,
          });
          const preparedContent = prepareIssueContent(request.content ?? null);
          const inserted = await insertIssue(transaction, {
            content: preparedContent.content,
            contentText: preparedContent.contentText,
            createdByMemberId: organization.memberId,
            number: allocation.number,
            organizationId: organization.organizationId,
            position,
            priority: request.priority ?? "none",
            projectId,
            statusId,
            title: request.title,
            updatedByMemberId: organization.memberId,
          });

          if (inserted === undefined) {
            throw new AppError(500, "INTERNAL_SERVER_ERROR", "The issue could not be created.");
          }

          if (request.assigneeMemberIds !== undefined) {
            await insertIssueAssignees(
              transaction,
              request.assigneeMemberIds.map((memberId) => ({
                issueId: inserted.id,
                memberId,
                organizationId: organization.organizationId,
                projectId,
              })),
            );
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

        return toIssueDetail(created);
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

      return toIssueDetail(record);
    },
    getByNumber: async ({ number, organization, projectId }) => {
      const resolved = await access.resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });
      assertProjectAction(resolved.access, "view");
      const record = await readIssueByNumber(db, organization.organizationId, projectId, number);

      if (record === undefined) {
        throw new AppError(404, "ISSUE_NOT_FOUND", "The issue was not found.");
      }

      return toIssueDetail(record);
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
      const [rawRecords, [total], facets] = await Promise.all([
        readIssueListPage(db, { direction, limit: pageSize, offset, sort, where }),
        countIssues(db, where),
        filters.includeFacets
          ? loadIssueFacets(db, organization.organizationId, projectId)
          : Promise.resolve(undefined),
      ]);
      const records = await withAssignees(db, organization.organizationId, rawRecords);
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
        loadProjectStatusIds(db, {
          organizationId: organization.organizationId,
          projectId,
        }),
        countIssuesByStatus(db, where),
      ]);
      const totals = new Map(counts.map((row) => [row.statusId, Number(row.value)]));
      const pages = await Promise.all(
        statuses.map(async (status) => {
          const rawRecords = await readIssueBoardColumnRecords(db, {
            statusId: status.id,
            where,
          });
          const records = await withAssignees(db, organization.organizationId, rawRecords);

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
      const rawRecords = await readIssueColumnRecords(db, {
        before,
        cursor,
        limit,
        statusId,
        where,
      });
      const records = await withAssignees(db, organization.organizationId, rawRecords);
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

        const existing = await findIssuesForUpdate(transaction, {
          issueIds,
          organizationId: organization.organizationId,
          projectId,
        });

        if (existing.length !== issueIds.length) {
          throw new AppError(404, "ISSUE_NOT_FOUND", "The issue was not found.");
        }

        await deleteIssues(transaction, {
          issueIds,
          organizationId: organization.organizationId,
          projectId,
        });
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

        const existing = await findIssueForUpdate(transaction, {
          issueId,
          organizationId: organization.organizationId,
          projectId,
        });

        if (existing === undefined) {
          throw new AppError(404, "ISSUE_NOT_FOUND", "The issue was not found.");
        }

        await deleteIssue(transaction, {
          issueId,
          organizationId: organization.organizationId,
          projectId,
        });
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
          const preview = await findIssueStatusForUpdate(transaction, {
            issueId,
            organizationId: organization.organizationId,
            projectId,
          });

          if (preview === undefined) {
            throw new AppError(404, "ISSUE_NOT_FOUND", "The issue was not found.");
          }

          const requestedStatusId = request.statusId ?? preview.statusId;

          if (request.placement !== undefined || requestedStatusId !== preview.statusId) {
            await lockIssueColumns(transaction, projectId, [preview.statusId, requestedStatusId]);
          }

          const existing = await findIssueWriteTargetForUpdate(transaction, {
            issueId,
            organizationId: organization.organizationId,
            projectId,
          });

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

          if (request.assigneeMemberIds !== undefined) {
            await requireAssignees(transaction, {
              assigneeMemberIds: request.assigneeMemberIds,
              organizationId: organization.organizationId,
              projectId,
              visibility: resolved.access.visibility,
            });
            await deleteIssueAssignees(transaction, {
              issueId,
              organizationId: organization.organizationId,
            });
            await insertIssueAssignees(
              transaction,
              request.assigneeMemberIds.map((memberId) => ({
                issueId,
                memberId,
                organizationId: organization.organizationId,
                projectId,
              })),
            );
          }

          const preparedContent =
            request.content === undefined ? undefined : prepareIssueContent(request.content);
          const saved = await updateIssue(transaction, {
            issueId,
            organizationId: organization.organizationId,
            projectId,
            values: {
              ...(preparedContent === undefined
                ? {}
                : { content: preparedContent.content, contentText: preparedContent.contentText }),
              ...(request.priority === undefined ? {} : { priority: request.priority }),
              ...(request.title === undefined ? {} : { title: request.title }),
              position,
              statusId,
              updatedByMemberId: organization.memberId,
            },
          });

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

        return toIssueDetail(updated);
      } catch (error) {
        throw mapIssueWriteError(error);
      }
    },
  };
}

async function resolveCreateStatusId(
  transaction: ProjectTransaction,
  input: { organizationId: string; projectId: string; statusId: string | undefined },
): Promise<string> {
  const record = await findCreateStatusForUpdate(transaction, input);

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

  if (
    databaseError.code === "23505" &&
    databaseError.constraint === "issue_project_number_unique"
  ) {
    return new AppError(
      409,
      "ISSUE_NUMBER_CONFLICT",
      "The issue number was already used. Try again.",
    );
  }

  if (databaseError.code === "23505") {
    return new AppError(500, "INTERNAL_SERVER_ERROR", "The issue could not be saved.");
  }

  if (databaseError.code === "23503") {
    return new AppError(404, "MEMBER_NOT_FOUND", "The member was not found in this workspace.");
  }

  return error;
}

function readDatabaseError(error: unknown, depth = 0): { code?: string; constraint?: string } {
  if (depth > 4 || typeof error !== "object" || error === null) {
    return {};
  }

  const record = error as { cause?: unknown; code?: unknown; constraint?: unknown };

  if (typeof record.code === "string") {
    return {
      code: record.code,
      constraint: typeof record.constraint === "string" ? record.constraint : undefined,
    };
  }

  return readDatabaseError(record.cause, depth + 1);
}

export { clearIssueAssignees, createIssueService, type IssueService };
