import type { Database } from "@teamos/db";
import { project, projectMembership } from "@teamos/db/schema";
import {
  canPerformProjectAction,
  parseProjectRole,
  parseProjectVisibility,
  type ProjectAccessContext,
  type ProjectAction,
  type ProjectRole,
  type ProjectVisibility,
} from "@teamos/shared";
import { and, eq } from "drizzle-orm";

import type { OrganizationAccess } from "@/auth/index.js";
import { AppError } from "@/errors/index.js";

type ProjectTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

interface ResolveProjectInput {
  actorMemberId: string;
  organizationId: string;
  organizationRole: OrganizationAccess["role"];
  projectId: string;
}

interface ResolvedProjectRecord {
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  slug: string;
  updatedAt: Date;
  visibility: ProjectVisibility;
}

interface ResolvedProject {
  access: ProjectAccessContext;
  project: ResolvedProjectRecord;
}

function toProjectNotFoundError(): AppError {
  return new AppError(404, "PROJECT_NOT_FOUND", "The project was not found.");
}

function toProjectVisibility(value: string): ProjectVisibility {
  /*
   * An unrecognized value is treated as private so a data anomaly can never
   * widen access beyond what the row was meant to grant.
   */
  return parseProjectVisibility(value) ?? "private";
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
 * Authorization is resolved before the transaction for fast rejection, then
 * re-checked after the project row is locked. Lock the project row before any
 * status row so issue placement and column reorder cannot deadlock.
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

function createProjectAccess(db: Database) {
  const projectSelection = {
    createdAt: project.createdAt,
    description: project.description,
    id: project.id,
    name: project.name,
    slug: project.slug,
    updatedAt: project.updatedAt,
    visibility: project.visibility,
  };

  async function resolveProject(input: ResolveProjectInput): Promise<ResolvedProject> {
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

  return { resolveProject };
}

export {
  assertActorAccessAfterLock,
  assertProjectAction,
  createProjectAccess,
  findProjectRole,
  lockProject,
  toProjectNotFoundError,
  toProjectVisibility,
  type ProjectTransaction,
  type ResolvedProject,
};
