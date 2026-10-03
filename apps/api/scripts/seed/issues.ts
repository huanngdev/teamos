import { faker } from "@faker-js/faker";
import { projectMembership, projectStatus } from "@teamos/db/schema";
import { issueContentFromPlainText, issuePriorities } from "@teamos/shared";
import { and, asc, eq } from "drizzle-orm";

import { createIssueService } from "../../src/services/issues.js";
import { createOrganizationMemberService } from "../../src/services/organization-members.js";
import { optionalEnv, type SeedContext } from "./context.js";

const titleMax = 140;
const contentTextMax = 5000;
const seedIssueMax = 200;

async function seedIssues(context: SeedContext): Promise<void> {
  const { db, organization, projectId } = context;
  const statuses = await db
    .select({ id: projectStatus.id })
    .from(projectStatus)
    .where(
      and(
        eq(projectStatus.organizationId, organization.organizationId),
        eq(projectStatus.projectId, projectId),
      ),
    )
    .orderBy(asc(projectStatus.position), asc(projectStatus.id));

  if (statuses.length === 0) {
    throw new Error("The project has no columns to seed.");
  }

  const members = await db
    .select({ memberId: projectMembership.memberId })
    .from(projectMembership)
    .where(
      and(
        eq(projectMembership.organizationId, organization.organizationId),
        eq(projectMembership.projectId, projectId),
      ),
    );
  const pinnedAssignee = optionalEnv("SEED_ASSIGNEE_MEMBER_ID");
  const assignees =
    pinnedAssignee === undefined ? members.map((item) => item.memberId) : [pinnedAssignee];
  const issues = createIssueService({
    db,
    members: createOrganizationMemberService(db),
  });
  const listed = await issues.list({ organization, projectId });
  const room = seedIssueMax - listed.total;

  if (room <= 0) {
    throw new Error("The project already has 200 issues.");
  }

  const countToCreate = Math.min(parseCount(process.env.SEED_ISSUE_COUNT), room);

  for (let index = 0; index < countToCreate; index += 1) {
    const status = statuses[index % statuses.length];

    if (status === undefined) {
      break;
    }

    const contentText = faker.datatype.boolean()
      ? faker.lorem.paragraph().trim().slice(0, contentTextMax)
      : undefined;
    const title = faker.lorem
      .sentence({ max: 8, min: 3 })
      .replace(/\.$/, "")
      .trim()
      .slice(0, titleMax);

    await issues.create({
      organization,
      projectId,
      request: {
        ...(assignees.length === 0 || !faker.datatype.boolean()
          ? {}
          : { assigneeMemberIds: [faker.helpers.arrayElement(assignees)] }),
        ...(contentText === undefined ? {} : { content: issueContentFromPlainText(contentText) }),
        priority: faker.helpers.arrayElement([...issuePriorities]),
        statusId: status.id,
        title: title.length > 0 ? title : "Seeded issue",
      },
    });
  }

  console.log(`Seeded ${countToCreate} issues.`);
}

function parseCount(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) {
    return 15;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > seedIssueMax) {
    console.error(`SEED_ISSUE_COUNT must be an integer from 1 to ${seedIssueMax}.`);
    process.exit(1);
  }

  return parsed;
}

export { seedIssues };
