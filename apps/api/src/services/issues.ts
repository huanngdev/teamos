import type { Database } from "@teamos/db";
import { issue, projectStatus } from "@teamos/db/schema";
import {
  ISSUE_BOARD_MAX,
  canPerformProjectAction,
  issuePrioritySchema,
  type CreateIssueRequest,
  type IssueSummary,
  type OrganizationMember,
  type ProjectVisibility,
  type UpdateIssueRequest,
} from "@teamos/shared";
import { and, asc, count, eq, max, ne } from "drizzle-orm";

import type { OrganizationAccess } from "@/auth/index.js";
import { AppError } from "@/errors/index.js";
import { placeAtIndex } from "@/services/issue-position.js";
import {
  assertActorAccessAfterLock,
  assertProjectAction,
  createProjectAccess,
  findProjectRole,
  lockProject,
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
  list: (input: {
    organization: OrganizationAccess;
    projectId: string;
  }) => Promise<{ issues: IssueSummary[]; total: number }>;
  remove: (input: {
    organization: OrganizationAccess;
    projectId: string;
    issueId: string;
  }) => Promise<void>;
  update: (input: {
    issueId: string;
    organization: OrganizationAccess;
    projectId: string;
    request: UpdateIssueRequest;
  }) => Promise<IssueSummary>;
}

interface IssueRecord {
  assigneeMemberId: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  number: number;
  position: number;
  priority: string;
  statusId: string;
  title: string;
  updatedAt: Date;
}

const issueSelection = {
  assigneeMemberId: issue.assigneeMemberId,
  createdAt: issue.createdAt,
  description: issue.description,
  id: issue.id,
  number: issue.number,
  position: issue.position,
  priority: issue.priority,
  statusId: issue.statusId,
  title: issue.title,
  updatedAt: issue.updatedAt,
};

function createIssueService(dependencies: {
  db: Database;
  members: IssueMemberLookup;
}): IssueService {
  const { db, members } = dependencies;
  const access = createProjectAccess(db);

  function toIssueSummary(record: IssueRecord): IssueSummary {
    const priority = issuePrioritySchema.safeParse(record.priority);

    if (!priority.success) {
      throw new AppError(500, "INTERNAL_SERVER_ERROR", "The issue could not be loaded.");
    }

    return {
      assigneeMemberId: record.assigneeMemberId,
      createdAt: record.createdAt.toISOString(),
      description: record.description,
      id: record.id,
      number: record.number,
      position: record.position,
      priority: priority.data,
      statusId: record.statusId,
      title: record.title,
      updatedAt: record.updatedAt.toISOString(),
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
          const locked = await lockProject(transaction, organization.organizationId, projectId);
          await assertActorAccessAfterLock(
            transaction,
            organization,
            projectId,
            locked.visibility,
            "create-issue",
          );

          const [issueCount] = await transaction
            .select({ value: count() })
            .from(issue)
            .where(
              and(
                eq(issue.organizationId, organization.organizationId),
                eq(issue.projectId, projectId),
              ),
            );

          if ((issueCount?.value ?? 0) >= ISSUE_BOARD_MAX) {
            throw new AppError(409, "CONFLICT", "A project can have at most 200 issues.");
          }

          const statusId = await resolveCreateStatusId(transaction, {
            organizationId: organization.organizationId,
            projectId,
            statusId: request.statusId,
          });

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
          const position = await placeIssue(transaction, {
            index: 0,
            organizationId: organization.organizationId,
            projectId,
            statusId,
          });
          const [record] = await transaction
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
            .returning(issueSelection);

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
    list: async ({ organization, projectId }) => {
      const resolved = await access.resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });
      assertProjectAction(resolved.access, "view");

      const records = await db
        .select(issueSelection)
        .from(issue)
        .innerJoin(
          projectStatus,
          and(
            eq(issue.statusId, projectStatus.id),
            eq(issue.projectId, projectStatus.projectId),
            eq(issue.organizationId, projectStatus.organizationId),
          ),
        )
        .where(
          and(
            eq(issue.organizationId, organization.organizationId),
            eq(issue.projectId, projectId),
          ),
        )
        .orderBy(asc(projectStatus.position), asc(issue.position), asc(issue.id))
        .limit(ISSUE_BOARD_MAX);
      const [total] = await db
        .select({ value: count() })
        .from(issue)
        .where(
          and(
            eq(issue.organizationId, organization.organizationId),
            eq(issue.projectId, projectId),
          ),
        );

      return {
        issues: records.map(toIssueSummary),
        total: total?.value ?? 0,
      };
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
        const locked = await lockProject(transaction, organization.organizationId, projectId);
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
          const locked = await lockProject(transaction, organization.organizationId, projectId);
          await assertActorAccessAfterLock(
            transaction,
            organization,
            projectId,
            locked.visibility,
            "update-issue",
          );

          const [existing] = await transaction
            .select(issueSelection)
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

          const statusId = request.statusId ?? existing.statusId;
          const shouldPlace = request.statusId !== undefined || request.index !== undefined;
          const position = shouldPlace
            ? await placeIssue(transaction, {
                index: request.index ?? 0,
                movingId: issueId,
                organizationId: organization.organizationId,
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

          const [record] = await transaction
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
            .returning(issueSelection);

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

async function placeIssue(
  transaction: ProjectTransaction,
  input: {
    index: number;
    movingId?: string;
    organizationId: string;
    projectId: string;
    statusId: string;
  },
): Promise<number> {
  const [status] = await transaction
    .select({ id: projectStatus.id })
    .from(projectStatus)
    .where(
      and(
        eq(projectStatus.organizationId, input.organizationId),
        eq(projectStatus.projectId, input.projectId),
        eq(projectStatus.id, input.statusId),
      ),
    )
    .for("update")
    .limit(1);

  if (status === undefined) {
    throw new AppError(404, "PROJECT_STATUS_NOT_FOUND", "The column was not found.");
  }

  const neighbors = await transaction
    .select({ id: issue.id, position: issue.position })
    .from(issue)
    .where(
      and(
        eq(issue.organizationId, input.organizationId),
        eq(issue.projectId, input.projectId),
        eq(issue.statusId, input.statusId),
        input.movingId === undefined ? undefined : ne(issue.id, input.movingId),
      ),
    )
    .orderBy(asc(issue.position), asc(issue.id));
  const movingId = input.movingId ?? "new";
  const placement = placeAtIndex(neighbors, input.index, movingId);

  if (placement.kind === "position") {
    return placement.position;
  }

  let movingPosition = 0;

  for (const item of placement.positions) {
    if (item.id === movingId) {
      movingPosition = item.position;
      continue;
    }

    await transaction.update(issue).set({ position: item.position }).where(eq(issue.id, item.id));
  }

  return movingPosition;
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
