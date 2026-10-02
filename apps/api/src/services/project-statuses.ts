import type { Database } from "@teamos/db";
import { issue, projectStatus } from "@teamos/db/schema";
import {
  ISSUE_POSITION_GAP,
  PROJECT_STATUS_MAX,
  issueStatusCategorySchema,
  type CreateProjectStatusRequest,
  type IssueStatusCategory,
  type ProjectStatusSummary,
  type UpdateProjectStatusRequest,
} from "@teamos/shared";
import { and, asc, count, eq, max, ne, sql } from "drizzle-orm";

import type { OrganizationAccess } from "@/auth/index.js";
import { AppError } from "@/errors/index.js";
import { reorderByIndex } from "@/services/issue-position.js";
import {
  assertActorAccessAfterLock,
  assertProjectAction,
  createProjectAccess,
  lockProject,
  toProjectNotFoundError,
  type ProjectTransaction,
} from "@/services/project-access.js";

interface InsertDefaultProjectStatusesInput {
  createdByMemberId: string;
  organizationId: string;
  projectId: string;
}

/*
 * Keep this list aligned with the backfill in
 * packages/db/drizzle/0003_massive_swordsman.sql.
 */
const defaultProjectStatuses = [
  { category: "backlog", isDefault: true, name: "Backlog", position: 0 },
  { category: "unstarted", isDefault: false, name: "Todo", position: ISSUE_POSITION_GAP },
  { category: "started", isDefault: false, name: "In Progress", position: ISSUE_POSITION_GAP * 2 },
  { category: "completed", isDefault: false, name: "Done", position: ISSUE_POSITION_GAP * 3 },
  { category: "canceled", isDefault: false, name: "Canceled", position: ISSUE_POSITION_GAP * 4 },
] as const satisfies readonly {
  category: IssueStatusCategory;
  isDefault: boolean;
  name: string;
  position: number;
}[];

const STATUS_NAME_CONSTRAINT = "project_status_project_name_unique";

interface ProjectStatusService {
  create: (input: {
    organization: OrganizationAccess;
    projectId: string;
    request: CreateProjectStatusRequest;
  }) => Promise<ProjectStatusSummary>;
  list: (input: {
    organization: OrganizationAccess;
    projectId: string;
  }) => Promise<ProjectStatusSummary[]>;
  remove: (input: {
    organization: OrganizationAccess;
    projectId: string;
    statusId: string;
  }) => Promise<void>;
  update: (input: {
    organization: OrganizationAccess;
    projectId: string;
    request: UpdateProjectStatusRequest;
    statusId: string;
  }) => Promise<ProjectStatusSummary>;
}

function createProjectStatusService(db: Database): ProjectStatusService {
  const access = createProjectAccess(db);
  const statusSelection = {
    category: projectStatus.category,
    id: projectStatus.id,
    isDefault: projectStatus.isDefault,
    name: projectStatus.name,
    position: projectStatus.position,
  };

  function toStatusSummary(record: {
    category: string;
    id: string;
    isDefault: boolean;
    name: string;
    position: number;
  }): ProjectStatusSummary {
    const category = issueStatusCategorySchema.safeParse(record.category);

    if (!category.success) {
      throw new AppError(500, "INTERNAL_SERVER_ERROR", "The column could not be loaded.");
    }

    return {
      category: category.data,
      id: record.id,
      isDefault: record.isDefault,
      name: record.name,
      position: record.position,
    };
  }

  async function findStatus(
    executor: Database | ProjectTransaction,
    organizationId: string,
    projectId: string,
    statusId: string,
  ) {
    const [record] = await executor
      .select(statusSelection)
      .from(projectStatus)
      .where(
        and(
          eq(projectStatus.organizationId, organizationId),
          eq(projectStatus.projectId, projectId),
          eq(projectStatus.id, statusId),
        ),
      )
      .limit(1);

    return record;
  }

  return {
    create: async ({ organization, projectId, request }) => {
      const resolved = await access.resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });
      assertProjectAction(resolved.access, "update");

      try {
        const created = await db.transaction(async (transaction) => {
          const locked = await lockProject(transaction, organization.organizationId, projectId);
          await assertActorAccessAfterLock(
            transaction,
            organization,
            projectId,
            locked.visibility,
            "update",
          );

          const [statusCount] = await transaction
            .select({ value: count() })
            .from(projectStatus)
            .where(
              and(
                eq(projectStatus.organizationId, organization.organizationId),
                eq(projectStatus.projectId, projectId),
              ),
            );

          if ((statusCount?.value ?? 0) >= PROJECT_STATUS_MAX) {
            throw new AppError(409, "CONFLICT", "A project can have at most 20 columns.");
          }

          await assertStatusNameAvailable(transaction, {
            name: request.name,
            organizationId: organization.organizationId,
            projectId,
          });

          const [maxPosition] = await transaction
            .select({ value: max(projectStatus.position) })
            .from(projectStatus)
            .where(
              and(
                eq(projectStatus.organizationId, organization.organizationId),
                eq(projectStatus.projectId, projectId),
              ),
            );

          const [record] = await transaction
            .insert(projectStatus)
            .values({
              category: request.category,
              createdByMemberId: organization.memberId,
              isDefault: false,
              name: request.name,
              organizationId: organization.organizationId,
              position: (maxPosition?.value ?? -ISSUE_POSITION_GAP) + ISSUE_POSITION_GAP,
              projectId,
              updatedByMemberId: organization.memberId,
            })
            .returning(statusSelection);

          if (record === undefined) {
            throw new AppError(500, "INTERNAL_SERVER_ERROR", "The column could not be created.");
          }

          return record;
        });

        return toStatusSummary(created);
      } catch (error) {
        throw mapStatusWriteError(error);
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
        .select(statusSelection)
        .from(projectStatus)
        .where(
          and(
            eq(projectStatus.organizationId, organization.organizationId),
            eq(projectStatus.projectId, projectId),
          ),
        )
        .orderBy(asc(projectStatus.position), asc(projectStatus.id));

      return records.map(toStatusSummary);
    },
    remove: async ({ organization, projectId, statusId }) => {
      const resolved = await access.resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });
      assertProjectAction(resolved.access, "update");

      await db.transaction(async (transaction) => {
        const locked = await lockProject(transaction, organization.organizationId, projectId);
        await assertActorAccessAfterLock(
          transaction,
          organization,
          projectId,
          locked.visibility,
          "update",
        );

        const [status] = await transaction
          .select({ id: projectStatus.id, isDefault: projectStatus.isDefault })
          .from(projectStatus)
          .where(
            and(
              eq(projectStatus.organizationId, organization.organizationId),
              eq(projectStatus.projectId, projectId),
              eq(projectStatus.id, statusId),
            ),
          )
          .for("update")
          .limit(1);

        if (status === undefined) {
          throw new AppError(404, "PROJECT_STATUS_NOT_FOUND", "The column was not found.");
        }

        if (status.isDefault) {
          throw new AppError(409, "CONFLICT", "The default column cannot be deleted.");
        }

        const [issueCount] = await transaction
          .select({ value: count() })
          .from(issue)
          .where(
            and(
              eq(issue.organizationId, organization.organizationId),
              eq(issue.projectId, projectId),
              eq(issue.statusId, statusId),
            ),
          );

        if ((issueCount?.value ?? 0) > 0) {
          throw new AppError(
            409,
            "CONFLICT",
            "Move the issues out of this column before deleting it.",
          );
        }

        await transaction
          .delete(projectStatus)
          .where(
            and(
              eq(projectStatus.organizationId, organization.organizationId),
              eq(projectStatus.projectId, projectId),
              eq(projectStatus.id, statusId),
            ),
          );
      });
    },
    update: async ({ organization, projectId, request, statusId }) => {
      const resolved = await access.resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });
      assertProjectAction(resolved.access, "update");

      try {
        const updated = await db.transaction(async (transaction) => {
          const locked = await lockProject(transaction, organization.organizationId, projectId);
          await assertActorAccessAfterLock(
            transaction,
            organization,
            projectId,
            locked.visibility,
            "update",
          );

          const existing = await findStatus(
            transaction,
            organization.organizationId,
            projectId,
            statusId,
          );

          if (existing === undefined) {
            throw new AppError(404, "PROJECT_STATUS_NOT_FOUND", "The column was not found.");
          }

          if (request.name !== undefined) {
            await assertStatusNameAvailable(transaction, {
              name: request.name,
              organizationId: organization.organizationId,
              projectId,
              statusId,
            });
          }

          if (request.index !== undefined) {
            const records = await transaction
              .select({ id: projectStatus.id })
              .from(projectStatus)
              .where(
                and(
                  eq(projectStatus.organizationId, organization.organizationId),
                  eq(projectStatus.projectId, projectId),
                ),
              )
              .orderBy(asc(projectStatus.position), asc(projectStatus.id));

            const positions = reorderByIndex(
              records.map((record) => record.id),
              statusId,
              request.index,
            );

            for (const item of positions) {
              await transaction
                .update(projectStatus)
                .set({ position: item.position, updatedByMemberId: organization.memberId })
                .where(
                  and(
                    eq(projectStatus.organizationId, organization.organizationId),
                    eq(projectStatus.id, item.id),
                  ),
                );
            }
          }

          if (request.name !== undefined) {
            await transaction
              .update(projectStatus)
              .set({ name: request.name, updatedByMemberId: organization.memberId })
              .where(
                and(
                  eq(projectStatus.organizationId, organization.organizationId),
                  eq(projectStatus.projectId, projectId),
                  eq(projectStatus.id, statusId),
                ),
              );
          }

          const record = await findStatus(
            transaction,
            organization.organizationId,
            projectId,
            statusId,
          );

          if (record === undefined) {
            throw toProjectNotFoundError();
          }

          return record;
        });

        return toStatusSummary(updated);
      } catch (error) {
        throw mapStatusWriteError(error);
      }
    },
  };
}

async function insertDefaultProjectStatuses(
  transaction: ProjectTransaction,
  input: InsertDefaultProjectStatusesInput,
): Promise<void> {
  await transaction.insert(projectStatus).values(
    defaultProjectStatuses.map((status) => ({
      category: status.category,
      createdByMemberId: input.createdByMemberId,
      isDefault: status.isDefault,
      name: status.name,
      organizationId: input.organizationId,
      position: status.position,
      projectId: input.projectId,
      updatedByMemberId: input.createdByMemberId,
    })),
  );
}

async function assertStatusNameAvailable(
  transaction: ProjectTransaction,
  input: { name: string; organizationId: string; projectId: string; statusId?: string },
): Promise<void> {
  const [existing] = await transaction
    .select({ id: projectStatus.id })
    .from(projectStatus)
    .where(
      and(
        eq(projectStatus.organizationId, input.organizationId),
        eq(projectStatus.projectId, input.projectId),
        sql`lower(${projectStatus.name}) = ${input.name.toLowerCase()}`,
        input.statusId === undefined ? undefined : ne(projectStatus.id, input.statusId),
      ),
    )
    .limit(1);

  if (existing !== undefined) {
    throw new AppError(409, "PROJECT_STATUS_NAME_TAKEN", "That column name is already used.");
  }
}

function mapStatusWriteError(error: unknown): unknown {
  if (error instanceof AppError) {
    return error;
  }

  const databaseError = readDatabaseError(error);

  if (databaseError.code === "23505" && databaseError.constraint === STATUS_NAME_CONSTRAINT) {
    return new AppError(409, "PROJECT_STATUS_NAME_TAKEN", "That column name is already used.");
  }

  return error;
}

function readDatabaseError(error: unknown, depth = 0): { code?: string; constraint?: string } {
  if (depth > 4 || typeof error !== "object" || error === null) {
    return {};
  }

  const record = error as { cause?: unknown; code?: unknown; constraint?: unknown };
  const code = typeof record.code === "string" ? record.code : undefined;
  const constraint = typeof record.constraint === "string" ? record.constraint : undefined;

  if (code !== undefined) {
    return { code, constraint };
  }

  return readDatabaseError(record.cause, depth + 1);
}

export {
  createProjectStatusService,
  defaultProjectStatuses,
  insertDefaultProjectStatuses,
  type ProjectStatusService,
};
