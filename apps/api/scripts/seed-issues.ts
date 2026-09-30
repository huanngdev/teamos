import { createDatabase } from "@teamos/db";
import { member, organization, projectStatus } from "@teamos/db/schema";
import { ISSUE_BOARD_MAX, issuePriorities, parseOrganizationRole } from "@teamos/shared";
import { and, asc, eq } from "drizzle-orm";

import { createIssueService } from "../src/services/issues.js";
import { createOrganizationMemberService } from "../src/services/organization-members.js";

const databaseUrl = process.env.DATABASE_URL;

if (process.env.SEED_ISSUES !== "true") {
  console.error("Refusing to seed. Set SEED_ISSUES=true in apps/api/.env.");
  process.exit(1);
}

if (databaseUrl === undefined || databaseUrl.length === 0) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const organizationId = requiredEnv("SEED_ORGANIZATION_ID");
const projectId = requiredEnv("SEED_PROJECT_ID");
const actorMemberId = requiredEnv("SEED_ACTOR_MEMBER_ID");
const assigneeMemberId = optionalEnv("SEED_ASSIGNEE_MEMBER_ID");
const requestedCount = parseCount(process.env.SEED_ISSUE_COUNT);

const client = createDatabase({ connectionString: databaseUrl });
const db = client.db;

try {
  const [actor] = await db
    .select({
      createdAt: organization.createdAt,
      logo: organization.logo,
      memberId: member.id,
      name: organization.name,
      organizationId: organization.id,
      role: member.role,
      slug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.id, actorMemberId), eq(member.organizationId, organizationId)))
    .limit(1);

  if (actor === undefined) {
    throw new Error("SEED_ACTOR_MEMBER_ID is not a member of SEED_ORGANIZATION_ID.");
  }

  const role = parseOrganizationRole(actor.role);

  if (role === null) {
    throw new Error("The actor member has an unknown organization role.");
  }

  const statuses = await db
    .select({ id: projectStatus.id })
    .from(projectStatus)
    .where(
      and(eq(projectStatus.organizationId, organizationId), eq(projectStatus.projectId, projectId)),
    )
    .orderBy(asc(projectStatus.position), asc(projectStatus.id));

  if (statuses.length === 0) {
    throw new Error("The project has no columns to seed.");
  }

  const issues = createIssueService({
    db,
    members: createOrganizationMemberService(db),
  });
  const listed = await issues.list({
    organization: {
      createdAt: actor.createdAt,
      logo: actor.logo,
      memberId: actor.memberId,
      name: actor.name,
      organizationId: actor.organizationId,
      role,
      slug: actor.slug,
    },
    projectId,
  });
  const room = ISSUE_BOARD_MAX - listed.total;

  if (room <= 0) {
    throw new Error("The project already has 200 issues.");
  }

  const countToCreate = Math.min(requestedCount, room);
  const organizationAccess = {
    createdAt: actor.createdAt,
    logo: actor.logo,
    memberId: actor.memberId,
    name: actor.name,
    organizationId: actor.organizationId,
    role,
    slug: actor.slug,
  };

  for (let index = 0; index < countToCreate; index += 1) {
    const status = statuses[index % statuses.length];

    if (status === undefined) {
      break;
    }

    await issues.create({
      organization: organizationAccess,
      projectId,
      request: {
        assigneeMemberId,
        priority: issuePriorities[index % issuePriorities.length] ?? "none",
        statusId: status.id,
        title: `Seeded issue ${listed.total + index + 1}`,
      },
    });
  }

  console.log(`Seeded ${countToCreate} issues.`);
} finally {
  await client.close();
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim() ?? "";

  if (value.length === 0) {
    console.error(`${name} is required.`);
    process.exit(1);
  }

  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim() ?? "";

  return value.length === 0 ? undefined : value;
}

function parseCount(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) {
    return 15;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > ISSUE_BOARD_MAX) {
    console.error(`SEED_ISSUE_COUNT must be an integer from 1 to ${ISSUE_BOARD_MAX}.`);
    process.exit(1);
  }

  return parsed;
}
