import type { Database } from "@teamos/db";
import { issueView, member, projectMembership, projectStatus } from "@teamos/db/schema";
import {
  canCreateIssueView,
  canManageIssueView,
  canPerformProjectAction,
  canReadIssueView,
  issueViewVisibilitySchema,
  normalizeIssueViewDefinition,
  parseOrganizationRole,
  parseProjectRole,
  type CreateIssueViewRequest,
  type IssueViewDefinition,
  type IssueViewListResponse,
  type IssueViewSummary,
  type IssueViewVisibility,
  type ProjectRole,
  type ProjectVisibility,
  type UpdateIssueViewRequest,
} from "@teamos/shared";
import { and, asc, count, eq, inArray, or, sql } from "drizzle-orm";
import { ZodError } from "zod";

import type { OrganizationAccess } from "@/auth/index.js";
import { AppError } from "@/errors/index.js";
import { buildLiteralSearchCondition } from "@/services/search.js";
import {
  assertActorAccessAfterLock,
  assertProjectAction,
  createProjectAccess,
  findProjectRole,
  lockProject,
  toProjectNotFoundError,
  toProjectVisibility,
  type ProjectTransaction,
} from "@/services/project-access.js";

interface IssueViewService {
  create: (input: {
    organization: OrganizationAccess;
    projectId: string;
    request: CreateIssueViewRequest;
  }) => Promise<IssueViewSummary>;
  get: (input: {
    organization: OrganizationAccess;
    projectId: string;
    viewId: string;
  }) => Promise<IssueViewSummary>;
  list: (input: {
    limit: number;
    offset: number;
    organization: OrganizationAccess;
    projectId: string;
    search?: string | undefined;
  }) => Promise<IssueViewListResponse>;
  remove: (input: {
    organization: OrganizationAccess;
    projectId: string;
    viewId: string;
  }) => Promise<void>;
  update: (input: {
    organization: OrganizationAccess;
    projectId: string;
    request: UpdateIssueViewRequest;
    viewId: string;
  }) => Promise<IssueViewSummary>;
}

interface IssueViewRecord {
  createdAt: Date;
  definition: Record<string, unknown>;
  id: string;
  name: string;
  organizationId: string;
  ownerMemberId: string | null;
  projectId: string;
  revision: number;
  updatedAt: Date;
  visibility: string;
}

const issueViewSelection = {
  createdAt: issueView.createdAt,
  definition: issueView.definition,
  id: issueView.id,
  name: issueView.name,
  organizationId: issueView.organizationId,
  ownerMemberId: issueView.ownerMemberId,
  projectId: issueView.projectId,
  revision: issueView.revision,
  updatedAt: issueView.updatedAt,
  visibility: issueView.visibility,
};

function viewNotFound(): AppError {
  return new AppError(404, "ISSUE_VIEW_NOT_FOUND", "The view was not found.");
}

function viewForbidden(): AppError {
  return new AppError(403, "FORBIDDEN", "You are not allowed to perform this action.");
}

function viewConflict(): AppError {
  return new AppError(
    409,
    "CONFLICT",
    "This view was saved somewhere else. Reload it and try again.",
  );
}

function visibleViewWhere(organizationId: string, projectId: string, actorMemberId: string) {
  return and(
    eq(issueView.organizationId, organizationId),
    eq(issueView.projectId, projectId),
    or(
      eq(issueView.visibility, "project"),
      and(eq(issueView.visibility, "personal"), eq(issueView.ownerMemberId, actorMemberId)),
    ),
  );
}

function readVisibility(value: string): IssueViewVisibility {
  const parsed = issueViewVisibilitySchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError(500, "INTERNAL_SERVER_ERROR", "The view could not be loaded.");
  }

  return parsed.data;
}

function readDefinition(value: Record<string, unknown>): IssueViewDefinition {
  try {
    return normalizeIssueViewDefinition(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(500, "INTERNAL_SERVER_ERROR", "The view could not be loaded.");
    }

    throw error;
  }
}

function toIssueViewSummary(record: IssueViewRecord): IssueViewSummary {
  return {
    createdAt: record.createdAt.toISOString(),
    definition: readDefinition(record.definition),
    id: record.id,
    name: record.name,
    revision: record.revision,
    updatedAt: record.updatedAt.toISOString(),
    visibility: readVisibility(record.visibility),
  };
}

function actorFor(
  organization: OrganizationAccess,
  projectRole: ProjectRole | null | undefined,
  visibility: ProjectVisibility,
) {
  const access = {
    organizationRole: organization.role,
    projectRole: projectRole ?? null,
    visibility,
  };

  return {
    actorMemberId: organization.memberId,
    canUpdateProject: canPerformProjectAction("update", access),
    canViewProject: canPerformProjectAction("view", access),
  };
}

async function assertDefinitionReferences(
  transaction: ProjectTransaction,
  input: {
    definition: IssueViewDefinition;
    organizationId: string;
    projectId: string;
    visibility: ProjectVisibility;
  },
): Promise<void> {
  const statusIds = input.definition.filters.statusIds ?? [];

  if (statusIds.length > 0) {
    const statuses = await transaction
      .select({ id: projectStatus.id })
      .from(projectStatus)
      .where(
        and(
          eq(projectStatus.organizationId, input.organizationId),
          eq(projectStatus.projectId, input.projectId),
          inArray(projectStatus.id, statusIds),
        ),
      );

    if (statuses.length !== statusIds.length) {
      throw new AppError(404, "PROJECT_STATUS_NOT_FOUND", "A selected column was not found.");
    }
  }

  const memberIds = input.definition.filters.assignee?.memberIds ?? [];

  if (memberIds.length === 0) {
    return;
  }

  const members = await transaction
    .select({ id: member.id, role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, input.organizationId), inArray(member.id, memberIds)));

  if (members.length !== memberIds.length) {
    throw new AppError(404, "MEMBER_NOT_FOUND", "The member was not found in this workspace.");
  }

  const memberships = await transaction
    .select({ memberId: projectMembership.memberId, role: projectMembership.role })
    .from(projectMembership)
    .where(
      and(
        eq(projectMembership.organizationId, input.organizationId),
        eq(projectMembership.projectId, input.projectId),
        inArray(projectMembership.memberId, memberIds),
      ),
    );
  const projectRoles = new Map(
    memberships.map((membership) => [
      membership.memberId,
      parseProjectRole(membership.role) ?? null,
    ]),
  );

  for (const record of members) {
    const organizationRole = parseOrganizationRole(record.role);

    if (
      organizationRole === undefined ||
      !canPerformProjectAction("view", {
        organizationRole,
        projectRole: projectRoles.get(record.id) ?? null,
        visibility: input.visibility,
      })
    ) {
      throw new AppError(404, "MEMBER_NOT_FOUND", "The member was not found in this workspace.");
    }
  }
}

function createIssueViewService(db: Database): IssueViewService {
  const access = createProjectAccess(db);

  async function requireProject(organization: OrganizationAccess, projectId: string) {
    const resolved = await access.resolveProject({
      actorMemberId: organization.memberId,
      organizationId: organization.organizationId,
      organizationRole: organization.role,
      projectId,
    });
    assertProjectAction(resolved.access, "view");

    return resolved;
  }

  return {
    create: async ({ organization, projectId, request }) => {
      const resolved = await requireProject(organization, projectId);
      const actor = actorFor(organization, resolved.access.projectRole, resolved.access.visibility);

      if (!canCreateIssueView(request.visibility, actor)) {
        throw viewForbidden();
      }

      const definition = normalizeIssueViewDefinition(request.definition);
      const created = await db.transaction(async (transaction) => {
        const locked = await lockProject(transaction, organization.organizationId, projectId);
        await assertActorAccessAfterLock(
          transaction,
          organization,
          projectId,
          locked.visibility,
          "view",
        );
        const projectRole =
          (await findProjectRole(
            transaction,
            organization.organizationId,
            projectId,
            organization.memberId,
          )) ?? null;
        const lockedVisibility = toProjectVisibility(locked.visibility);
        const lockedActor = actorFor(organization, projectRole, lockedVisibility);

        if (!lockedActor.canViewProject) {
          throw toProjectNotFoundError();
        }

        if (!canCreateIssueView(request.visibility, lockedActor)) {
          throw viewForbidden();
        }

        await assertDefinitionReferences(transaction, {
          definition,
          organizationId: organization.organizationId,
          projectId,
          visibility: lockedVisibility,
        });
        const [record] = await transaction
          .insert(issueView)
          .values({
            createdByMemberId: organization.memberId,
            definition,
            name: request.name,
            organizationId: organization.organizationId,
            ownerMemberId: request.visibility === "personal" ? organization.memberId : null,
            projectId,
            updatedByMemberId: organization.memberId,
            visibility: request.visibility,
          })
          .returning(issueViewSelection);

        if (record === undefined) {
          throw new AppError(500, "INTERNAL_SERVER_ERROR", "The view could not be created.");
        }

        return record;
      });

      return toIssueViewSummary(created);
    },
    get: async ({ organization, projectId, viewId }) => {
      const resolved = await requireProject(organization, projectId);
      const [record] = await db
        .select(issueViewSelection)
        .from(issueView)
        .where(
          and(
            eq(issueView.organizationId, organization.organizationId),
            eq(issueView.projectId, projectId),
            eq(issueView.id, viewId),
          ),
        )
        .limit(1);

      if (record === undefined) {
        throw viewNotFound();
      }

      if (
        !canReadIssueView({
          ...actorFor(organization, resolved.access.projectRole, resolved.access.visibility),
          ownerMemberId: record.ownerMemberId,
          visibility: readVisibility(record.visibility),
        })
      ) {
        throw viewNotFound();
      }

      return toIssueViewSummary(record);
    },
    list: async ({ limit, offset, organization, projectId, search }) => {
      await requireProject(organization, projectId);
      const where = and(
        visibleViewWhere(organization.organizationId, projectId, organization.memberId),
        buildLiteralSearchCondition([issueView.name], search),
      );
      const [records, [total]] = await Promise.all([
        db
          .select(issueViewSelection)
          .from(issueView)
          .where(where)
          .orderBy(
            asc(sql`case when ${issueView.visibility} = 'project' then 0 else 1 end`),
            asc(sql`lower(${issueView.name})`),
            asc(issueView.id),
          )
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(issueView).where(where),
      ]);

      return {
        pagination: { limit, offset, total: total?.value ?? 0 },
        views: records.map(toIssueViewSummary),
      };
    },
    remove: async ({ organization, projectId, viewId }) => {
      await requireProject(organization, projectId);

      await db.transaction(async (transaction) => {
        const locked = await lockProject(transaction, organization.organizationId, projectId);
        await assertActorAccessAfterLock(
          transaction,
          organization,
          projectId,
          locked.visibility,
          "view",
        );
        const [record] = await transaction
          .select(issueViewSelection)
          .from(issueView)
          .where(
            and(
              eq(issueView.organizationId, organization.organizationId),
              eq(issueView.projectId, projectId),
              eq(issueView.id, viewId),
            ),
          )
          .for("update")
          .limit(1);

        if (record === undefined) {
          throw viewNotFound();
        }

        const projectRole =
          (await findProjectRole(
            transaction,
            organization.organizationId,
            projectId,
            organization.memberId,
          )) ?? null;
        const viewAccess = {
          ...actorFor(organization, projectRole, toProjectVisibility(locked.visibility)),
          ownerMemberId: record.ownerMemberId,
          visibility: readVisibility(record.visibility),
        };

        if (!canReadIssueView(viewAccess)) {
          throw viewNotFound();
        }

        if (!canManageIssueView(viewAccess)) {
          throw viewForbidden();
        }

        await transaction
          .delete(issueView)
          .where(
            and(
              eq(issueView.organizationId, organization.organizationId),
              eq(issueView.projectId, projectId),
              eq(issueView.id, viewId),
            ),
          );
      });
    },
    update: async ({ organization, projectId, request, viewId }) => {
      await requireProject(organization, projectId);
      const definition =
        request.definition === undefined
          ? undefined
          : normalizeIssueViewDefinition(request.definition);
      const updated = await db.transaction(async (transaction) => {
        const locked = await lockProject(transaction, organization.organizationId, projectId);
        await assertActorAccessAfterLock(
          transaction,
          organization,
          projectId,
          locked.visibility,
          "view",
        );
        const [record] = await transaction
          .select(issueViewSelection)
          .from(issueView)
          .where(
            and(
              eq(issueView.organizationId, organization.organizationId),
              eq(issueView.projectId, projectId),
              eq(issueView.id, viewId),
            ),
          )
          .for("update")
          .limit(1);

        if (record === undefined) {
          throw viewNotFound();
        }

        const projectRole =
          (await findProjectRole(
            transaction,
            organization.organizationId,
            projectId,
            organization.memberId,
          )) ?? null;
        const lockedVisibility = toProjectVisibility(locked.visibility);
        const viewAccess = {
          ...actorFor(organization, projectRole, lockedVisibility),
          ownerMemberId: record.ownerMemberId,
          visibility: readVisibility(record.visibility),
        };

        if (!canReadIssueView(viewAccess)) {
          throw viewNotFound();
        }

        if (!canManageIssueView(viewAccess)) {
          throw viewForbidden();
        }

        if (record.revision !== request.expectedRevision) {
          throw viewConflict();
        }

        if (definition !== undefined) {
          await assertDefinitionReferences(transaction, {
            definition,
            organizationId: organization.organizationId,
            projectId,
            visibility: lockedVisibility,
          });
        }

        const [next] = await transaction
          .update(issueView)
          .set({
            ...(definition === undefined ? {} : { definition }),
            ...(request.name === undefined ? {} : { name: request.name }),
            revision: sql`${issueView.revision} + 1`,
            updatedByMemberId: organization.memberId,
          })
          .where(
            and(
              eq(issueView.organizationId, organization.organizationId),
              eq(issueView.projectId, projectId),
              eq(issueView.id, viewId),
              eq(issueView.revision, request.expectedRevision),
            ),
          )
          .returning(issueViewSelection);

        if (next === undefined) {
          throw viewConflict();
        }

        return next;
      });

      return toIssueViewSummary(updated);
    },
  };
}

export { createIssueViewService, type IssueViewService };
