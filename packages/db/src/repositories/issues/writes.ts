import { ISSUE_NUMBER_MAX } from "@teamos/shared";
import { and, eq, inArray, max, sql } from "drizzle-orm";

import { issue, issueAssignee, projectIssueCounter, projectStatus } from "../../schema/index.js";
import type { IssueExecutor } from "./types.js";

type IssueInsertValues = typeof issue.$inferInsert;

interface IssueUpdateValues {
  content?: unknown;
  contentText?: string;
  position: number;
  priority?: string;
  statusId: string;
  title?: string;
  updatedByMemberId: string;
}

interface IssueAssigneeValues {
  issueId: string;
  memberId: string;
  organizationId: string;
  projectId: string;
}

const issueNumberCeiling = BigInt(ISSUE_NUMBER_MAX);

/*
 * Allocation is all-or-nothing inside the caller's transaction. The result is
 * a typed outcome instead of an error because the API layer owns the HTTP
 * mapping of "exhausted" and "unavailable".
 */
type AllocateIssueNumberResult =
  | { kind: "allocated"; number: bigint }
  | { kind: "exhausted" }
  | { kind: "unavailable" };

async function insertIssue(
  executor: IssueExecutor,
  values: IssueInsertValues,
): Promise<{ id: string } | undefined> {
  const [inserted] = await executor.insert(issue).values(values).returning({ id: issue.id });

  return inserted;
}

async function insertIssueAssignees(
  executor: IssueExecutor,
  values: readonly IssueAssigneeValues[],
): Promise<void> {
  if (values.length === 0) {
    return;
  }

  await executor.insert(issueAssignee).values([...values]);
}

async function deleteIssueAssignees(
  executor: IssueExecutor,
  input: { issueId: string; organizationId: string },
): Promise<void> {
  await executor
    .delete(issueAssignee)
    .where(
      and(
        eq(issueAssignee.issueId, input.issueId),
        eq(issueAssignee.organizationId, input.organizationId),
      ),
    );
}

async function updateIssue(
  executor: IssueExecutor,
  input: {
    issueId: string;
    organizationId: string;
    projectId: string;
    values: IssueUpdateValues;
  },
): Promise<{ id: string } | undefined> {
  const [saved] = await executor
    .update(issue)
    .set({
      ...(input.values.content === undefined && input.values.contentText === undefined
        ? {}
        : { content: input.values.content, contentText: input.values.contentText }),
      ...(input.values.priority === undefined ? {} : { priority: input.values.priority }),
      ...(input.values.title === undefined ? {} : { title: input.values.title }),
      position: input.values.position,
      statusId: input.values.statusId,
      updatedByMemberId: input.values.updatedByMemberId,
    })
    .where(
      and(
        eq(issue.organizationId, input.organizationId),
        eq(issue.projectId, input.projectId),
        eq(issue.id, input.issueId),
      ),
    )
    .returning({ id: issue.id });

  return saved;
}

async function findIssueStatusForUpdate(
  executor: IssueExecutor,
  input: { issueId: string; organizationId: string; projectId: string },
): Promise<{ statusId: string } | undefined> {
  const [preview] = await executor
    .select({ statusId: issue.statusId })
    .from(issue)
    .where(
      and(
        eq(issue.organizationId, input.organizationId),
        eq(issue.projectId, input.projectId),
        eq(issue.id, input.issueId),
      ),
    )
    .limit(1);

  return preview;
}

async function findIssueWriteTargetForUpdate(
  executor: IssueExecutor,
  input: { issueId: string; organizationId: string; projectId: string },
): Promise<{ position: number; statusId: string; updatedAt: Date } | undefined> {
  const [existing] = await executor
    .select({
      position: issue.position,
      statusId: issue.statusId,
      updatedAt: issue.updatedAt,
    })
    .from(issue)
    .where(
      and(
        eq(issue.organizationId, input.organizationId),
        eq(issue.projectId, input.projectId),
        eq(issue.id, input.issueId),
      ),
    )
    .for("update")
    .limit(1);

  return existing;
}

async function findIssueForUpdate(
  executor: IssueExecutor,
  input: { issueId: string; organizationId: string; projectId: string },
): Promise<{ id: string } | undefined> {
  const [existing] = await executor
    .select({ id: issue.id })
    .from(issue)
    .where(
      and(
        eq(issue.organizationId, input.organizationId),
        eq(issue.projectId, input.projectId),
        eq(issue.id, input.issueId),
      ),
    )
    .for("update")
    .limit(1);

  return existing;
}

async function findIssuesForUpdate(
  executor: IssueExecutor,
  input: { issueIds: readonly string[]; organizationId: string; projectId: string },
): Promise<Array<{ id: string }>> {
  return executor
    .select({ id: issue.id })
    .from(issue)
    .where(
      and(
        eq(issue.organizationId, input.organizationId),
        eq(issue.projectId, input.projectId),
        inArray(issue.id, [...input.issueIds]),
      ),
    )
    .for("update");
}

async function deleteIssue(
  executor: IssueExecutor,
  input: { issueId: string; organizationId: string; projectId: string },
): Promise<void> {
  await executor
    .delete(issue)
    .where(
      and(
        eq(issue.organizationId, input.organizationId),
        eq(issue.projectId, input.projectId),
        eq(issue.id, input.issueId),
      ),
    );
}

async function deleteIssues(
  executor: IssueExecutor,
  input: { issueIds: readonly string[]; organizationId: string; projectId: string },
): Promise<void> {
  await executor
    .delete(issue)
    .where(
      and(
        eq(issue.organizationId, input.organizationId),
        eq(issue.projectId, input.projectId),
        inArray(issue.id, [...input.issueIds]),
      ),
    );
}

async function findCreateStatusForUpdate(
  executor: IssueExecutor,
  input: { organizationId: string; projectId: string; statusId: string | undefined },
): Promise<{ id: string } | undefined> {
  const [record] = await executor
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

  return record;
}

async function clearIssueAssignees(
  executor: IssueExecutor,
  input: { memberId: string; organizationId: string; projectId?: string },
): Promise<void> {
  const conditions = [
    eq(issueAssignee.organizationId, input.organizationId),
    eq(issueAssignee.memberId, input.memberId),
  ];

  if (input.projectId !== undefined) {
    conditions.push(eq(issueAssignee.projectId, input.projectId));
  }

  await executor.delete(issueAssignee).where(and(...conditions));
}

async function allocateIssueNumber(
  executor: IssueExecutor,
  input: { organizationId: string; projectId: string },
): Promise<AllocateIssueNumberResult> {
  const readCounter = async () => {
    const [row] = await executor
      .select({ lastNumber: projectIssueCounter.lastNumber })
      .from(projectIssueCounter)
      .where(
        and(
          eq(projectIssueCounter.projectId, input.projectId),
          eq(projectIssueCounter.organizationId, input.organizationId),
        ),
      )
      .for("update")
      .limit(1);

    return row;
  };

  let counter = await readCounter();

  if (counter === undefined) {
    const [maxNumber] = await executor
      .select({ value: max(issue.number) })
      .from(issue)
      .where(
        and(eq(issue.organizationId, input.organizationId), eq(issue.projectId, input.projectId)),
      );
    await executor
      .insert(projectIssueCounter)
      .values({
        lastNumber: maxNumber?.value ?? 0n,
        organizationId: input.organizationId,
        projectId: input.projectId,
      })
      .onConflictDoNothing({ target: projectIssueCounter.projectId });
    counter = await readCounter();
  }

  if (counter === undefined) {
    return { kind: "unavailable" };
  }

  if (counter.lastNumber >= issueNumberCeiling) {
    return { kind: "exhausted" };
  }

  const [updated] = await executor
    .update(projectIssueCounter)
    .set({ lastNumber: sql`${projectIssueCounter.lastNumber} + 1` })
    .where(
      and(
        eq(projectIssueCounter.projectId, input.projectId),
        eq(projectIssueCounter.organizationId, input.organizationId),
      ),
    )
    .returning({ lastNumber: projectIssueCounter.lastNumber });

  if (updated === undefined) {
    return { kind: "unavailable" };
  }

  return { kind: "allocated", number: updated.lastNumber };
}

export {
  allocateIssueNumber,
  clearIssueAssignees,
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
  updateIssue,
  type AllocateIssueNumberResult,
  type IssueAssigneeValues,
  type IssueInsertValues,
  type IssueUpdateValues,
};
