import type { Database } from "@teamos/db";
import { member, project, projectMembership, user } from "@teamos/db/schema";
import {
  canPerformProjectAction,
  isOrganizationAdministrator,
  parseProjectRole,
  parseProjectVisibility,
  type CreateProjectRequest,
  type OrganizationMember,
  type ProjectAction,
  type ProjectAccessContext,
  type ProjectMember,
  type ProjectRole,
  type ProjectSummary,
  type ProjectVisibility,
  type SetProjectMemberRequest,
  type UpdateProjectRequest,
} from "@teamos/shared";
import { and, asc, count, eq, inArray, isNotNull, or, sql } from "drizzle-orm";

import type { OrganizationAccess } from "@/auth/index.js";
import { AppError } from "@/errors/index.js";
import { clearIssueAssignees } from "@/services/issues.js";
import { insertDefaultProjectStatuses } from "@/services/project-statuses.js";
import { buildLiteralSearchCondition } from "@/services/search.js";

type ProjectTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

interface ResolveProjectInput {
  actorMemberId: string;
  organizationId: string;
  organizationRole: OrganizationAccess["role"];
  projectId: string;
}

interface ResolvedProject {
  access: ProjectAccessContext;
  project: {
    createdAt: Date;
    description: string | null;
    id: string;
    name: string;
    slug: string;
    updatedAt: Date;
    visibility: ProjectVisibility;
  };
}

interface ProjectService {
  create: (input: {
    organization: OrganizationAccess;
    request: CreateProjectRequest;
  }) => Promise<ProjectSummary>;
  list: (input: {
    organization: OrganizationAccess;
    search?: string | undefined;
  }) => Promise<ProjectSummary[]>;
  listMembers: (input: {
    organization: OrganizationAccess;
    projectId: string;
  }) => Promise<ProjectMember[]>;
  remove: (input: { organization: OrganizationAccess; projectId: string }) => Promise<void>;
  removeMember: (input: {
    organization: OrganizationAccess;
    projectId: string;
    targetMemberId: string;
  }) => Promise<void>;
  setMember: (input: {
    organization: OrganizationAccess;
    projectId: string;
    request: SetProjectMemberRequest;
  }) => Promise<void>;
  update: (input: {
    organization: OrganizationAccess;
    projectId: string;
    request: UpdateProjectRequest;
  }) => Promise<ProjectSummary>;
}

interface ProjectServiceDependencies {
  db: Database;
  members: {
    findMember: (input: {
      memberId: string;
      organizationId: string;
    }) => Promise<OrganizationMember | undefined>;
  };
}

const UNIQUE_VIOLATION_CODE = "23505";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === UNIQUE_VIOLATION_CODE
  );
}

function toProjectNotFoundError(): AppError {
  return new AppError(404, "PROJECT_NOT_FOUND", "The project was not found.");
}

function createProjectService(dependencies: ProjectServiceDependencies): ProjectService {
  const { db, members } = dependencies;

  const projectSelection = {
    createdAt: project.createdAt,
    description: project.description,
    id: project.id,
    name: project.name,
    slug: project.slug,
    updatedAt: project.updatedAt,
    visibility: project.visibility,
  };

  function toProjectVisibility(value: string): ProjectVisibility {
    /*
     * An unrecognized value is treated as private so a data anomaly can never
     * widen access beyond what the row was meant to grant.
     */
    return parseProjectVisibility(value) ?? "private";
  }

  async function resolveProject(input: ResolveProjectInput): Promise<ResolvedProject> {
    /*
     * Resolved sequentially because Drizzle's query builder is a thenable that
     * breaks tuple inference in `Promise.all`. Both lookups are single-row
     * index hits, so the extra round trip is not worth the type noise.
     */
    const [record] = await db
      .select(projectSelection)
      .from(project)
      .where(and(eq(project.organizationId, input.organizationId), eq(project.id, input.projectId)))
      .limit(1);

    if (record === undefined) {
      throw toProjectNotFoundError();
    }

    const [membershipRecord] = await db
      .select({ role: projectMembership.role })
      .from(projectMembership)
      .where(
        and(
          eq(projectMembership.organizationId, input.organizationId),
          eq(projectMembership.projectId, input.projectId),
          eq(projectMembership.memberId, input.actorMemberId),
        ),
      )
      .limit(1);

    const visibility = toProjectVisibility(record.visibility);
    const projectRole =
      membershipRecord === undefined ? null : (parseProjectRole(membershipRecord.role) ?? null);

    return {
      access: { organizationRole: input.organizationRole, projectRole, visibility },
      project: { ...record, visibility },
    };
  }

  /*
   * A private project must not reveal that it exists, so a failed read check is
   * reported as not found. A permitted read with a denied action stays a 403.
   */
  function assertProjectAction(access: ProjectAccessContext, action: ProjectAction): void {
    if (canPerformProjectAction(action, access)) {
      return;
    }

    if (!canPerformProjectAction("view", access)) {
      throw toProjectNotFoundError();
    }

    throw new AppError(403, "FORBIDDEN", "You are not allowed to perform this action.");
  }

  /*
   * Authorization is resolved before the transaction for fast rejection, then
   * re-checked after the project row is locked for update. Locking serializes
   * concurrent lead or membership changes, so a role revoked mid-request cannot
   * still mutate the project after the revocation commits.
   */
  async function assertActorAccessAfterLock(
    transaction: ProjectTransaction,
    organization: OrganizationAccess,
    projectId: string,
    projectVisibility: string,
    action: ProjectAction,
  ): Promise<void> {
    const actorRole = await findProjectRole(
      transaction,
      organization.organizationId,
      projectId,
      organization.memberId,
    );

    assertProjectAction(
      {
        organizationRole: organization.role,
        projectRole: actorRole ?? null,
        visibility: toProjectVisibility(projectVisibility),
      },
      action,
    );
  }

  async function countMembers(projectIds: readonly string[]): Promise<Map<string, number>> {
    if (projectIds.length === 0) {
      return new Map();
    }

    const records = await db
      .select({ projectId: projectMembership.projectId, value: count() })
      .from(projectMembership)
      .where(inArray(projectMembership.projectId, [...projectIds]))
      .groupBy(projectMembership.projectId);

    return new Map(records.map((record) => [record.projectId, record.value]));
  }

  function toProjectSummary(
    record: {
      createdAt: Date;
      description: string | null;
      id: string;
      name: string;
      slug: string;
      updatedAt: Date;
      visibility: string;
    },
    memberCount: number,
    role: ProjectRole | null,
  ): ProjectSummary {
    return {
      createdAt: record.createdAt.toISOString(),
      description: record.description,
      id: record.id,
      memberCount,
      name: record.name,
      role,
      slug: record.slug,
      updatedAt: record.updatedAt.toISOString(),
      visibility: toProjectVisibility(record.visibility),
    };
  }

  return {
    create: async ({ organization, request }) => {
      let created;

      try {
        created = await db.transaction(async (transaction) => {
          const [record] = await transaction
            .insert(project)
            .values({
              createdByMemberId: organization.memberId,
              description: request.description ?? null,
              name: request.name,
              organizationId: organization.organizationId,
              slug: request.slug,
              updatedByMemberId: organization.memberId,
              visibility: request.visibility,
            })
            .returning(projectSelection);

          if (record === undefined) {
            throw new AppError(500, "INTERNAL_SERVER_ERROR", "The project could not be created.");
          }

          /*
           * Every workspace member may create a project and becomes its lead,
           * so a project always starts with exactly one lead.
           */
          await transaction.insert(projectMembership).values({
            createdByMemberId: organization.memberId,
            memberId: organization.memberId,
            organizationId: organization.organizationId,
            projectId: record.id,
            role: "lead",
          });
          await insertDefaultProjectStatuses(transaction, {
            createdByMemberId: organization.memberId,
            organizationId: organization.organizationId,
            projectId: record.id,
          });

          return record;
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(
            409,
            "PROJECT_SLUG_ALREADY_TAKEN",
            "That project slug is already used in this workspace.",
          );
        }

        throw error;
      }

      return toProjectSummary(created, 1, "lead");
    },
    list: async ({ organization, search }) => {
      const records = await db
        .select({ ...projectSelection, actorRole: projectMembership.role })
        .from(project)
        .leftJoin(
          projectMembership,
          and(
            eq(projectMembership.projectId, project.id),
            eq(projectMembership.memberId, organization.memberId),
          ),
        )
        .where(
          and(
            eq(project.organizationId, organization.organizationId),
            isOrganizationAdministrator(organization.role)
              ? undefined
              : or(eq(project.visibility, "workspace"), isNotNull(projectMembership.id)),
            buildLiteralSearchCondition([project.name], search),
          ),
        )
        .orderBy(asc(sql`lower(${project.name})`), asc(project.id));

      const memberCounts = await countMembers(records.map((record) => record.id));

      return records.map((record) =>
        toProjectSummary(
          record,
          memberCounts.get(record.id) ?? 0,
          record.actorRole === null ? null : (parseProjectRole(record.actorRole) ?? null),
        ),
      );
    },
    listMembers: async ({ organization, projectId }) => {
      const resolved = await resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });

      assertProjectAction(resolved.access, "view");

      const records = await db
        .select({
          email: user.email,
          image: user.image,
          memberId: projectMembership.memberId,
          name: user.name,
          role: projectMembership.role,
          userId: user.id,
        })
        .from(projectMembership)
        .innerJoin(member, eq(projectMembership.memberId, member.id))
        .innerJoin(user, eq(member.userId, user.id))
        .where(
          and(
            eq(projectMembership.organizationId, organization.organizationId),
            eq(projectMembership.projectId, projectId),
          ),
        )
        .orderBy(asc(sql`lower(${user.name})`), asc(projectMembership.memberId));

      return records.map((record) => ({
        email: record.email,
        image: record.image,
        memberId: record.memberId,
        name: record.name,
        role: parseProjectRole(record.role) ?? "viewer",
        userId: record.userId,
      }));
    },
    remove: async ({ organization, projectId }) => {
      const resolved = await resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });

      assertProjectAction(resolved.access, "delete");

      await db.transaction(async (transaction) => {
        const locked = await lockProject(transaction, organization.organizationId, projectId);

        await assertActorAccessAfterLock(
          transaction,
          organization,
          projectId,
          locked.visibility,
          "delete",
        );

        await transaction
          .delete(project)
          .where(
            and(eq(project.organizationId, organization.organizationId), eq(project.id, projectId)),
          );
      });
    },
    removeMember: async ({ organization, projectId, targetMemberId }) => {
      const resolved = await resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });

      assertProjectAction(resolved.access, "manage-members");

      const target = await members.findMember({
        memberId: targetMemberId,
        organizationId: organization.organizationId,
      });

      if (target === undefined) {
        throw new AppError(404, "MEMBER_NOT_FOUND", "The member was not found in this workspace.");
      }

      await db.transaction(async (transaction) => {
        /*
         * Locking the project row serializes concurrent lead changes so two
         * requests cannot each believe another lead will remain.
         */
        const locked = await lockProject(transaction, organization.organizationId, projectId);

        await assertActorAccessAfterLock(
          transaction,
          organization,
          projectId,
          locked.visibility,
          "manage-members",
        );

        const targetRole = await findProjectRole(
          transaction,
          organization.organizationId,
          projectId,
          targetMemberId,
        );

        if (targetRole === "lead") {
          await assertLeadCanChange(transaction, projectId, organization.role);
        }

        /*
         * Assignee points at the member with ON DELETE RESTRICT, so clear this
         * project's assignments before the membership row disappears.
         */
        await clearIssueAssignees(transaction, {
          memberId: targetMemberId,
          organizationId: organization.organizationId,
          projectId,
        });

        await transaction
          .delete(projectMembership)
          .where(
            and(
              eq(projectMembership.organizationId, organization.organizationId),
              eq(projectMembership.projectId, projectId),
              eq(projectMembership.memberId, targetMemberId),
            ),
          );
      });
    },
    setMember: async ({ organization, projectId, request }) => {
      const resolved = await resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });

      assertProjectAction(resolved.access, "manage-members");

      const target = await members.findMember({
        memberId: request.memberId,
        organizationId: organization.organizationId,
      });

      if (target === undefined) {
        throw new AppError(404, "MEMBER_NOT_FOUND", "The member was not found in this workspace.");
      }

      await db.transaction(async (transaction) => {
        const locked = await lockProject(transaction, organization.organizationId, projectId);

        await assertActorAccessAfterLock(
          transaction,
          organization,
          projectId,
          locked.visibility,
          "manage-members",
        );

        const targetRole = await findProjectRole(
          transaction,
          organization.organizationId,
          projectId,
          request.memberId,
        );

        if (targetRole === "lead" && request.role !== "lead") {
          await assertLeadCanChange(transaction, projectId, organization.role);
        }

        await transaction
          .insert(projectMembership)
          .values({
            createdByMemberId: organization.memberId,
            memberId: request.memberId,
            organizationId: organization.organizationId,
            projectId,
            role: request.role,
          })
          .onConflictDoUpdate({
            set: { role: request.role, updatedAt: new Date() },
            target: [projectMembership.projectId, projectMembership.memberId],
          });
      });
    },
    update: async ({ organization, projectId, request }) => {
      const resolved = await resolveProject({
        actorMemberId: organization.memberId,
        organizationId: organization.organizationId,
        organizationRole: organization.role,
        projectId,
      });

      assertProjectAction(resolved.access, "update");

      const record = await db.transaction(async (transaction) => {
        const locked = await lockProject(transaction, organization.organizationId, projectId);

        await assertActorAccessAfterLock(
          transaction,
          organization,
          projectId,
          locked.visibility,
          "update",
        );

        const [updated] = await transaction
          .update(project)
          .set({
            ...(request.description === undefined ? {} : { description: request.description }),
            ...(request.name === undefined ? {} : { name: request.name }),
            ...(request.visibility === undefined ? {} : { visibility: request.visibility }),
            updatedByMemberId: organization.memberId,
          })
          .where(
            and(eq(project.organizationId, organization.organizationId), eq(project.id, projectId)),
          )
          .returning(projectSelection);

        return updated;
      });

      if (record === undefined) {
        throw toProjectNotFoundError();
      }

      const memberCounts = await countMembers([record.id]);

      return toProjectSummary(
        record,
        memberCounts.get(record.id) ?? 0,
        resolved.access.projectRole,
      );
    },
  };
}

async function lockProject(
  transaction: ProjectTransaction,
  organizationId: string,
  projectId: string,
): Promise<{ id: string; visibility: string }> {
  const [record] = await transaction
    .select({ id: project.id, visibility: project.visibility })
    .from(project)
    .where(and(eq(project.organizationId, organizationId), eq(project.id, projectId)))
    .for("update")
    .limit(1);

  if (record === undefined) {
    throw toProjectNotFoundError();
  }

  return record;
}

async function findProjectRole(
  transaction: ProjectTransaction,
  organizationId: string,
  projectId: string,
  memberId: string,
): Promise<ProjectRole | undefined> {
  const [record] = await transaction
    .select({ role: projectMembership.role })
    .from(projectMembership)
    .where(
      and(
        eq(projectMembership.organizationId, organizationId),
        eq(projectMembership.projectId, projectId),
        eq(projectMembership.memberId, memberId),
      ),
    )
    .limit(1);

  return record === undefined ? undefined : parseProjectRole(record.role);
}

/*
 * A project must keep at least one lead. Organization administrators may still
 * change the last lead because they retain full control of the project and can
 * restore a lead afterwards.
 */
async function assertLeadCanChange(
  transaction: ProjectTransaction,
  projectId: string,
  actorOrganizationRole: OrganizationAccess["role"],
): Promise<void> {
  if (isOrganizationAdministrator(actorOrganizationRole)) {
    return;
  }

  const [record] = await transaction
    .select({ value: count() })
    .from(projectMembership)
    .where(and(eq(projectMembership.projectId, projectId), eq(projectMembership.role, "lead")));

  if ((record?.value ?? 0) <= 1) {
    throw new AppError(409, "CONFLICT", "A project must keep at least one lead.");
  }
}

export { createProjectService, type ProjectService };
