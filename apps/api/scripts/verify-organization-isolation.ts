import { createDatabase } from "@teamos/db";
import {
  decodeIssueColumnCursor,
  ISSUE_COLUMN_PAGE_SIZE,
  issueContentFromPlainText,
  parseIssueListQuery,
} from "@teamos/shared";
import { sql } from "drizzle-orm";

import {
  createOrganizationAccessService,
  type OrganizationAccess,
} from "../src/auth/organization-access.js";
import { createIssueService } from "../src/services/issues.js";
import { createIssueViewService } from "../src/services/issue-views.js";
import { createOrganizationMemberService } from "../src/services/organization-members.js";
import { createProjectService } from "../src/services/projects.js";
import { createProjectStatusService } from "../src/services/project-statuses.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://teamos_user:teamos_password@localhost:5432/teamos";

/*
 * Local integration check for tenant isolation and project authorization. It
 * runs against a live PostgreSQL database, creates temporary rows, and removes
 * them again. Run it with `bun run --cwd apps/api verify:isolation`.
 */
const client = createDatabase({ connectionString: DATABASE_URL });
const db = client.db;

const ids = {
  orgA: `verify-org-a-${crypto.randomUUID()}`,
  orgB: `verify-org-b-${crypto.randomUUID()}`,
  userA: `verify-user-a-${crypto.randomUUID()}`,
  userB: `verify-user-b-${crypto.randomUUID()}`,
  userC: `verify-user-c-${crypto.randomUUID()}`,
  userD: `verify-user-d-${crypto.randomUUID()}`,
};

const memberA = `${ids.orgA}-m-a`;
const memberC = `${ids.orgA}-m-c`;
const memberB = `${ids.orgB}-m-b`;
const memberD = `${ids.orgA}-m-d`;

async function seed() {
  const now = new Date();

  for (const [userId, email] of [
    [ids.userA, "verify-a@example.com"],
    [ids.userB, "verify-b@example.com"],
    [ids.userC, "verify-c@example.com"],
    [ids.userD, "verify-d@example.com"],
  ] as const) {
    await db.execute(
      sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
          values (${userId}, ${userId}, ${email}, true, ${now}, ${now})`,
    );
  }

  await db.execute(
    sql`insert into organization (id, name, slug, created_at) values (${ids.orgA}, 'Verify A', ${ids.orgA}, ${now})`,
  );
  await db.execute(
    sql`insert into organization (id, name, slug, created_at) values (${ids.orgB}, 'Verify B', ${ids.orgB}, ${now})`,
  );

  await db.execute(
    sql`insert into member (id, organization_id, user_id, role, created_at)
        values (${memberA}, ${ids.orgA}, ${ids.userA}, 'owner', ${now})`,
  );
  await db.execute(
    sql`insert into member (id, organization_id, user_id, role, created_at)
        values (${memberC}, ${ids.orgA}, ${ids.userC}, 'member', ${now})`,
  );
  await db.execute(
    sql`insert into member (id, organization_id, user_id, role, created_at)
        values (${memberB}, ${ids.orgB}, ${ids.userB}, 'owner', ${now})`,
  );
  await db.execute(
    sql`insert into member (id, organization_id, user_id, role, created_at)
        values (${memberD}, ${ids.orgA}, ${ids.userD}, 'member', ${now})`,
  );
}

async function cleanup() {
  /*
   * Assignee references restrict member deletion. Clear them before the
   * organization cascade removes the member rows.
   */
  await db.execute(
    sql`delete from issue_assignee where organization_id in (${ids.orgA}, ${ids.orgB})`,
  );
  await db.execute(sql`delete from organization where id in (${ids.orgA}, ${ids.orgB})`);
  await db.execute(
    sql`delete from "user" where id in (${ids.userA}, ${ids.userB}, ${ids.userC}, ${ids.userD})`,
  );
}

function check(label: string, condition: boolean) {
  process.stdout.write(`${condition ? "PASS" : "FAIL"} ${label}\n`);
  if (!condition) {
    process.exitCode = 1;
  }
}

async function rejects(action: () => Promise<unknown>): Promise<boolean> {
  return (await rejected(action)) !== null;
}

async function rejected(
  action: () => Promise<unknown>,
): Promise<{ code: string; status: number } | null> {
  try {
    await action();
    return null;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      "status" in error &&
      typeof error.code === "string" &&
      typeof error.status === "number"
    ) {
      return { code: error.code, status: error.status };
    }

    return { code: "UNKNOWN", status: 0 };
  }
}

async function verifyPagedIssues(input: {
  issues: ReturnType<typeof createIssueService>;
  orgA: OrganizationAccess;
  orgAMember: OrganizationAccess;
  orgB: OrganizationAccess;
  projects: ReturnType<typeof createProjectService>;
  statuses: ReturnType<typeof createProjectStatusService>;
}) {
  const { issues, orgA, orgAMember, orgB, projects, statuses } = input;
  const project = await projects.create({
    organization: orgA,
    request: {
      name: "Paging",
      slug: `paging-${crypto.randomUUID().slice(0, 8)}`,
      visibility: "private",
    },
  });
  const projectStatuses = await statuses.list({ organization: orgA, projectId: project.id });
  const backlog = projectStatuses.find((status) => status.isDefault);
  const todo = projectStatuses.find((status) => status.name === "Todo");

  check(
    "paging project has a default column and Todo",
    backlog !== undefined && todo !== undefined,
  );
  if (backlog === undefined || todo === undefined) {
    return;
  }

  await db.execute(sql`
    insert into issue (
      organization_id,
      project_id,
      status_id,
      number,
      title,
      content,
      content_text,
      priority,
      position,
      created_by_member_id,
      updated_by_member_id
    )
    select
      ${orgA.organizationId},
      ${project.id}::uuid,
      case when g <= 50 then ${backlog.id}::uuid else ${todo.id}::uuid end,
      g::int,
      case
        when g = 1 then 'Alder'
        when g = 2 then 'Alder'
        else 'Paged ' || g::text
      end,
      jsonb_build_object(
        'version', 1,
        'root', jsonb_build_object(
          'type', 'root',
          'version', 1,
          'direction', null,
          'format', '',
          'indent', 0,
          'children', jsonb_build_array(jsonb_build_object(
            'type', 'paragraph',
            'version', 1,
            'direction', null,
            'format', '',
            'indent', 0,
            'children', jsonb_build_array(jsonb_build_object(
              'type', 'text',
              'version', 1,
              'detail', 0,
              'format', 0,
              'mode', 'normal',
              'style', '',
              'text', 'Flight notes ' || g::text
            ))
          ))
        )
      ),
      'Flight notes ' || g::text,
      'none',
      (g * 1000)::int,
      ${memberA},
      ${memberA}
    from generate_series(1, 53) as g
  `);
  await db.execute(sql`
    update project_issue_counter
    set last_number = greatest(last_number, 53)
    where project_id = ${project.id}::uuid
  `);

  const board = await issues.listBoard({ organization: orgA, projectId: project.id });
  const fat = board.columns.find((column) => column.statusId === backlog.id);
  const thin = board.columns.find((column) => column.statusId === todo.id);
  const fatCard = fat?.issues[0];

  check(
    "each column pages and counts on its own",
    fat?.total === 50 &&
      fat.issues.length === ISSUE_COLUMN_PAGE_SIZE &&
      fat.hasMore &&
      thin?.total === 3 &&
      thin.issues.length === 3 &&
      !thin.hasMore,
  );
  check(
    "a board card omits the content document",
    fatCard !== undefined && !("content" in fatCard),
  );

  const detail = await issues.get({
    issueId: fat?.issues[0]?.id ?? "",
    organization: orgA,
    projectId: project.id,
  });

  check(
    "issue detail returns the stored content",
    detail.contentText.startsWith("Flight notes") && detail.content !== null,
  );

  const firstPage = await issues.list({
    direction: "asc",
    organization: orgA,
    page: 1,
    pageSize: 10,
    projectId: project.id,
    sort: "title",
  });
  const secondPage = await issues.list({
    direction: "asc",
    organization: orgA,
    page: 2,
    pageSize: 10,
    projectId: project.id,
    sort: "title",
  });
  const deepPage = await issues.list({
    organization: orgA,
    page: 100,
    pageSize: 10,
    projectId: project.id,
    sort: "number",
  });
  const titleIds = firstPage.issues
    .filter((issue) => issue.title === "Alder")
    .map((issue) => issue.id);
  const titleIdsDescending = (
    await issues.list({
      direction: "desc",
      organization: orgA,
      page: 2,
      pageSize: 50,
      projectId: project.id,
      sort: "title",
    })
  ).issues
    .filter((issue) => issue.title === "Alder")
    .map((issue) => issue.id);
  const firstIds = new Set(firstPage.issues.map((issue) => issue.id));

  check(
    "table pages do not overlap and an empty page keeps the real total",
    firstPage.total === 53 &&
      firstPage.pageCount === 6 &&
      secondPage.issues.every((issue) => !firstIds.has(issue.id)) &&
      deepPage.issues.length === 0 &&
      deepPage.total === 53 &&
      deepPage.pageCount === 6,
  );
  check(
    "equal titles keep id order when the sort direction flips",
    titleIds.length === 2 &&
      titleIds[0] !== undefined &&
      titleIds[0] < (titleIds[1] ?? "") &&
      titleIdsDescending[0] === titleIds[0] &&
      titleIdsDescending[1] === titleIds[1],
  );

  const seen = new Set<string>();
  let cursor: { id: string; position: number; scope: string; statusId: string } | undefined;
  let paged = 0;
  let duplicate = false;

  for (let page = 0; page < 8; page += 1) {
    const columnPage = await issues.listColumn({
      before: false,
      cursor,
      limit: 10,
      organization: orgA,
      projectId: project.id,
      statusId: backlog.id,
    });

    paged += columnPage.issues.length;

    for (const card of columnPage.issues) {
      if (seen.has(card.id)) {
        duplicate = true;
      }

      seen.add(card.id);
    }

    if (columnPage.nextCursor === null) {
      break;
    }

    const decoded = decodeIssueColumnCursor(columnPage.nextCursor);

    if (decoded === undefined) {
      duplicate = true;
      break;
    }

    cursor = decoded;
  }

  check(
    "column pages load without duplicate cards",
    !duplicate && seen.size === 50 && paged === 50,
  );

  const mismatched = await rejected(() =>
    issues.listColumn({
      before: false,
      cursor: cursor === undefined ? undefined : { ...cursor, scope: "other-filter" },
      limit: 10,
      organization: orgA,
      projectId: project.id,
      statusId: backlog.id,
    }),
  );

  check(
    "a cursor from another filter is rejected",
    mismatched?.status === 400 && mismatched.code === "VALIDATION_ERROR",
  );

  const foreign = await rejected(() =>
    issues.listBoard({ organization: orgB, projectId: project.id }),
  );

  check(
    "another workspace cannot read the board",
    foreign?.status === 404 && foreign.code === "PROJECT_NOT_FOUND",
  );

  const hidden = await rejected(() =>
    issues.list({ organization: orgAMember, projectId: project.id }),
  );

  check(
    "a workspace member cannot read a private project's pages",
    hidden?.status === 404 && hidden.code === "PROJECT_NOT_FOUND",
  );

  const anchor = thin?.issues[0];
  const tail = thin?.issues[2];
  const middle = thin?.issues[1];

  if (anchor === undefined || tail === undefined || middle === undefined) {
    check("partial-column placement stays next to the anchor", false);
    return;
  }

  const beforePositions = await db.execute(sql`
    select id, position
    from issue
    where organization_id = ${orgA.organizationId}
      and project_id = ${project.id}::uuid
      and status_id = ${todo.id}::uuid
  `);
  const moved = await issues.update({
    issueId: tail.id,
    organization: orgA,
    projectId: project.id,
    request: { placement: { anchorIssueId: anchor.id, type: "after" } },
  });
  const afterPositions = await db.execute(sql`
    select id, position
    from issue
    where organization_id = ${orgA.organizationId}
      and project_id = ${project.id}::uuid
      and status_id = ${todo.id}::uuid
  `);
  const beforeById = new Map(rowsOf(beforePositions).map((row) => [row.id, Number(row.position)]));
  const changed = rowsOf(afterPositions).filter(
    (row) => beforeById.get(row.id) !== Number(row.position),
  ).length;
  const ordered = await issues.listColumn({
    before: false,
    cursor: undefined,
    limit: 10,
    organization: orgA,
    projectId: project.id,
    statusId: todo.id,
  });

  check(
    "dropping after a loaded card does not send the issue to the column end",
    moved.statusId === todo.id &&
      ordered.issues[0]?.id === anchor.id &&
      ordered.issues[1]?.id === tail.id &&
      ordered.issues[2]?.id === middle.id &&
      changed === 1,
  );

  const started = await issues.update({
    issueId: middle.id,
    organization: orgA,
    projectId: project.id,
    request: { placement: { type: "start" } },
  });
  const ended = await issues.update({
    issueId: anchor.id,
    organization: orgA,
    projectId: project.id,
    request: { placement: { type: "end" } },
  });
  const ends = await issues.listColumn({
    before: false,
    cursor: undefined,
    limit: 10,
    organization: orgA,
    projectId: project.id,
    statusId: todo.id,
  });

  check(
    "start and end use the real column edges",
    started.id === ends.issues[0]?.id && ended.id === ends.issues[ends.issues.length - 1]?.id,
  );

  const staleAnchor = await rejected(() =>
    issues.update({
      issueId: tail.id,
      organization: orgA,
      projectId: project.id,
      request: { placement: { anchorIssueId: crypto.randomUUID(), type: "before" } },
    }),
  );
  const selfAnchor = await rejected(() =>
    issues.update({
      issueId: tail.id,
      organization: orgA,
      projectId: project.id,
      request: { placement: { anchorIssueId: tail.id, type: "before" } },
    }),
  );
  const wrongColumn = await rejected(() =>
    issues.update({
      issueId: tail.id,
      organization: orgA,
      projectId: project.id,
      request: {
        placement: { anchorIssueId: fat?.issues[0]?.id ?? crypto.randomUUID(), type: "after" },
      },
    }),
  );

  check(
    "a missing, self, or other-column anchor conflicts",
    staleAnchor?.status === 409 &&
      staleAnchor.code === "ISSUE_PLACEMENT_CONFLICT" &&
      selfAnchor?.code === "ISSUE_PLACEMENT_CONFLICT" &&
      wrongColumn?.code === "ISSUE_PLACEMENT_CONFLICT",
  );

  const current = await issues.get({
    issueId: tail.id,
    organization: orgA,
    projectId: project.id,
  });
  const [firstWrite, secondWrite] = await Promise.all([
    rejected(() =>
      issues.update({
        issueId: tail.id,
        organization: orgA,
        projectId: project.id,
        request: { expectedUpdatedAt: current.updatedAt, title: "Concurrent one" },
      }),
    ),
    rejected(() =>
      issues.update({
        issueId: tail.id,
        organization: orgA,
        projectId: project.id,
        request: { expectedUpdatedAt: current.updatedAt, title: "Concurrent two" },
      }),
    ),
  ]);
  const conflicts = [firstWrite, secondWrite].filter(
    (result) => result?.code === "ISSUE_REVISION_CONFLICT",
  );

  check("one of two stale revisions is rejected", conflicts.length === 1);

  await db.execute(sql`
    insert into issue (
      organization_id, project_id, status_id, number, title, priority, position,
      created_by_member_id, updated_by_member_id
    )
    values
      (${orgA.organizationId}, ${project.id}::uuid, ${todo.id}::uuid, 300, 'Packed A', 'none', 10, ${memberA}, ${memberA}),
      (${orgA.organizationId}, ${project.id}::uuid, ${todo.id}::uuid, 301, 'Packed B', 'none', 11, ${memberA}, ${memberA}),
      (${orgA.organizationId}, ${project.id}::uuid, ${todo.id}::uuid, 302, 'Packed C', 'none', 12, ${memberA}, ${memberA})
  `);
  await db.execute(sql`
    update project_issue_counter
    set last_number = greatest(last_number, 302)
    where project_id = ${project.id}::uuid
  `);
  const packed = await issues.listColumn({
    before: false,
    cursor: undefined,
    limit: 10,
    organization: orgA,
    projectId: project.id,
    statusId: todo.id,
  });
  const packedC = packed.issues.find((issue) => issue.title === "Packed C");
  const packedB = packed.issues.find((issue) => issue.title === "Packed B");

  if (packedC === undefined || packedB === undefined) {
    check("a tight gap rebalances without rewriting the whole column", false);
  } else {
    const fatBefore = await positionSum(orgA.organizationId, project.id, backlog.id);
    const rebalanced = await issues.update({
      issueId: packedC.id,
      organization: orgA,
      projectId: project.id,
      request: { placement: { anchorIssueId: packedB.id, type: "before" } },
    });
    const fatAfter = await positionSum(orgA.organizationId, project.id, backlog.id);
    const packedOrder = await issues.listColumn({
      before: false,
      cursor: undefined,
      limit: 20,
      organization: orgA,
      projectId: project.id,
      statusId: todo.id,
    });
    const packedIndex = packedOrder.issues.findIndex((issue) => issue.id === rebalanced.id);
    const neighbor = packedOrder.issues[packedIndex + 1];

    check(
      "a tight gap rebalances without rewriting the whole column",
      neighbor?.id === packedB.id && fatBefore === fatAfter && rebalanced.position !== 12,
    );
  }

  await issues.update({
    issueId: fat?.issues[0]?.id ?? detail.id,
    organization: orgA,
    projectId: project.id,
    request: { priority: "high" },
  });
  const filtered = await issues.listBoard({
    filters: parseIssueListQuery({ priority: "high" }),
    organization: orgA,
    projectId: project.id,
  });
  const filteredFat = filtered.columns.find((column) => column.statusId === backlog.id);

  check(
    "a filter is applied before the column page and count",
    filteredFat?.total === 1 &&
      filteredFat.issues.length === 1 &&
      filteredFat.issues[0]?.priority === "high",
  );

  const deniedAssignee = await rejected(() =>
    issues.update({
      issueId: detail.id,
      organization: orgA,
      projectId: project.id,
      request: { assigneeMemberIds: [memberD] },
    }),
  );
  const privateAssignees = await projects.listEligibleAssignees({
    ids: memberD,
    organization: orgA,
    projectId: project.id,
  });

  check(
    "a private project rejects an assignee who cannot view it",
    deniedAssignee?.status === 404 &&
      deniedAssignee.code === "MEMBER_NOT_FOUND" &&
      privateAssignees.assignees.length === 0,
  );

  const open = await projects.create({
    organization: orgA,
    request: {
      name: "Open",
      slug: `open-${crypto.randomUUID().slice(0, 8)}`,
      visibility: "workspace",
    },
  });
  const openMembers = await projects.listMembers({ organization: orgA, projectId: open.id });
  const eligible = await projects.listEligibleAssignees({
    organization: orgA,
    projectId: open.id,
  });
  const eligibleIds = new Set(eligible.assignees.map((assignee) => assignee.id));
  const openIssue = await issues.create({
    organization: orgA,
    projectId: open.id,
    request: { assigneeMemberIds: [memberD], title: "Shared" },
  });
  const mixedCursor = await rejected(() =>
    projects.listEligibleAssignees({
      cursor: "cursor",
      ids: memberD,
      organization: orgA,
      projectId: open.id,
    }),
  );

  check(
    "workspace-visible assignees include members without a project role",
    openMembers.length === 1 &&
      openMembers.every((member) => member.memberId !== memberD) &&
      eligibleIds.has(memberD) &&
      eligibleIds.has(memberC) &&
      openIssue.assignees.some((assignee) => assignee.id === memberD) &&
      mixedCursor?.status === 400,
  );
}

function rowsOf(result: unknown): { id: string; position: number }[] {
  if (Array.isArray(result)) {
    return result as { id: string; position: number }[];
  }

  if (
    typeof result === "object" &&
    result !== null &&
    "rows" in result &&
    Array.isArray(result.rows)
  ) {
    return result.rows as { id: string; position: number }[];
  }

  return [];
}

async function positionSum(
  organizationId: string,
  projectId: string,
  statusId: string,
): Promise<number> {
  const result = await db.execute(sql`
    select coalesce(sum(position), 0) as sum
    from issue
    where organization_id = ${organizationId}
      and project_id = ${projectId}::uuid
      and status_id = ${statusId}::uuid
  `);
  const row = rowsOf(result)[0] as { sum?: string | number | null } | undefined;

  return Number(row?.sum ?? 0);
}

async function main() {
  await client.connect();
  await cleanup();
  await seed();

  const access = createOrganizationAccessService(db);
  const members = createOrganizationMemberService(db);
  const projects = createProjectService({ db, members });
  const issues = createIssueService({ db, members });
  const views = createIssueViewService(db);
  const statuses = createProjectStatusService(db);

  const orgA = await access.resolve({ organizationSlug: ids.orgA, userId: ids.userA });
  const orgB = await access.resolve({ organizationSlug: ids.orgB, userId: ids.userB });
  const orgAMember = await access.resolve({ organizationSlug: ids.orgA, userId: ids.userC });

  check("owner resolves the organization", orgA !== undefined && orgB !== undefined);
  check("plain member resolves the organization", orgAMember !== undefined);
  if (orgA === undefined || orgB === undefined || orgAMember === undefined) {
    return;
  }

  check("counts workspace members", (await members.count(orgA.organizationId)) === 3);
  check(
    "bounds the member page",
    (
      await members.list({
        limit: 1,
        offset: 0,
        organizationId: orgA.organizationId,
        search: undefined,
      })
    ).members.length === 1,
  );
  check(
    "searches email case-insensitively",
    (
      await members.list({
        limit: 25,
        offset: 0,
        organizationId: orgA.organizationId,
        search: "VERIFY-C@",
      })
    ).total === 1,
  );
  check(
    "treats a LIKE wildcard as a literal",
    (
      await members.list({
        limit: 25,
        offset: 0,
        organizationId: orgA.organizationId,
        search: "%",
      })
    ).total === 0,
  );
  check(
    "search cannot cross the workspace boundary",
    (
      await members.list({
        limit: 25,
        offset: 0,
        organizationId: orgB.organizationId,
        search: "verify-c@",
      })
    ).total === 0,
  );

  const privateProject = await projects.create({
    organization: orgA,
    request: { name: "Apollo", slug: "apollo", visibility: "private" },
  });
  check("creator becomes the project lead and only member", privateProject.memberCount === 1);
  check(
    "owner lists the private project",
    (await projects.list({ organization: orgA })).length === 1,
  );
  check(
    "plain member cannot see a private project",
    (await projects.list({ organization: orgAMember })).length === 0,
  );
  check(
    "private project is hidden from a non-member",
    await rejects(() =>
      projects.listMembers({ organization: orgAMember, projectId: privateProject.id }),
    ),
  );
  check(
    "private project issues are hidden from an unassigned member",
    await rejects(() => issues.list({ organization: orgAMember, projectId: privateProject.id })),
  );
  const seededStatuses = await statuses.list({
    organization: orgA,
    projectId: privateProject.id,
  });
  const defaultStatus = seededStatuses.find((status) => status.isDefault);
  check("a new project seeds five columns", seededStatuses.length === 5);
  check(
    "exactly one column is the default backlog",
    seededStatuses.filter((status) => status.isDefault).length === 1 &&
      defaultStatus?.name === "Backlog",
  );

  const workspaceProject = await projects.create({
    organization: orgAMember,
    request: { name: "Zephyr", slug: "zephyr", visibility: "workspace" },
  });
  check(
    "workspace project is visible to the workspace",
    (await projects.list({ organization: orgA })).length === 2,
  );
  check(
    "project search matches a case-insensitive substring",
    (await projects.list({ organization: orgA, search: "ZEPH" })).length === 1,
  );
  check(
    "project search treats a LIKE wildcard as a literal",
    (await projects.list({ organization: orgA, search: "%" })).length === 0,
  );
  check(
    "project search cannot cross the workspace boundary",
    (await projects.list({ organization: orgB, search: "apollo" })).length === 0,
  );
  const leadDelete = await rejected(() =>
    projects.remove({
      organization: orgAMember,
      projectId: workspaceProject.id,
      request: { confirmationName: "Zephyr" },
    }),
  );
  check(
    "project lead cannot delete a project",
    leadDelete?.code === "FORBIDDEN" && leadDelete.status === 403,
  );
  try {
    await projects.remove({
      organization: orgA,
      projectId: workspaceProject.id,
      request: { confirmationName: "Zephyr" },
    });
    check("owner can delete a project", true);
  } catch {
    check("owner can delete a project", false);
  }

  const disposable = await projects.create({
    organization: orgA,
    request: { name: "Disposable", slug: "disposable", visibility: "workspace" },
  });
  await issues.create({
    organization: orgA,
    projectId: disposable.id,
    request: { title: "Gone" },
  });
  const wrongName = await rejected(() =>
    projects.remove({
      organization: orgA,
      projectId: disposable.id,
      request: { confirmationName: "disposable" },
    }),
  );
  check(
    "wrong project name does not delete",
    wrongName?.code === "VALIDATION_ERROR" && wrongName.status === 422,
  );
  check(
    "project remains after a wrong confirmation",
    (await projects.list({ organization: orgA })).some((item) => item.id === disposable.id),
  );
  try {
    await projects.remove({
      organization: orgA,
      projectId: disposable.id,
      request: { confirmationName: "Disposable" },
    });
    check(
      "owner can delete a project that has an issue",
      (await projects.list({ organization: orgA })).every((item) => item.id !== disposable.id),
    );
  } catch {
    check("owner can delete a project that has an issue", false);
  }

  check(
    "a member from another workspace cannot be granted a project role",
    await rejects(() =>
      projects.setMember({
        organization: orgA,
        projectId: privateProject.id,
        request: { memberId: memberB, role: "viewer" },
      }),
    ),
  );

  check(
    "an unknown member id is not reported as granted",
    await rejects(() =>
      projects.setMember({
        organization: orgA,
        projectId: privateProject.id,
        request: { memberId: "does-not-exist", role: "viewer" },
      }),
    ),
  );

  await projects.setMember({
    organization: orgA,
    projectId: privateProject.id,
    request: { memberId: memberC, role: "member" },
  });
  check(
    "grants a project role to a workspace member",
    (await projects.listMembers({ organization: orgA, projectId: privateProject.id })).length === 2,
  );
  check(
    "plain member can now see the private project",
    (await projects.list({ organization: orgAMember })).length === 1,
  );

  const firstIssue = await issues.create({
    organization: orgAMember,
    projectId: privateProject.id,
    request: { title: "First" },
  });
  const secondIssue = await issues.create({
    organization: orgA,
    projectId: privateProject.id,
    request: { title: "Second" },
  });
  const board = await issues.listBoard({ organization: orgA, projectId: privateProject.id });
  const defaultColumn = board.columns.find((column) => column.statusId === defaultStatus?.id);
  const todo = seededStatuses.find((status) => status.name === "Todo");
  check(
    "first issue lands on the default column as number 1",
    firstIssue.statusId === defaultStatus?.id && firstIssue.number === "1",
  );
  const byNumber = await issues.getByNumber({
    number: "1",
    organization: orgA,
    projectId: privateProject.id,
  });
  const hiddenNumber = await rejected(() =>
    issues.getByNumber({
      number: "1",
      organization: orgB,
      projectId: privateProject.id,
    }),
  );
  const coded = await issues.list({
    filters: parseIssueListQuery({ q: "I-0001" }),
    organization: orgA,
    projectId: privateProject.id,
  });
  const orgAStranger = await access.resolve({ organizationSlug: ids.orgA, userId: ids.userD });
  const privateHidden =
    orgAStranger === undefined
      ? null
      : await rejected(() =>
          issues.getByNumber({
            number: "1",
            organization: orgAStranger,
            projectId: privateProject.id,
          }),
        );
  const emptyProject = await projects.create({
    organization: orgA,
    request: {
      name: "Empty numbers",
      slug: `empty-${crypto.randomUUID().slice(0, 8)}`,
      visibility: "workspace",
    },
  });
  const otherProject = await rejected(() =>
    issues.getByNumber({
      number: "1",
      organization: orgA,
      projectId: emptyProject.id,
    }),
  );
  const prefix = await issues.list({
    filters: parseIssueListQuery({ q: "i-000" }),
    organization: orgA,
    projectId: privateProject.id,
  });
  const bareCode = await issues.list({
    filters: parseIssueListQuery({ q: "i-" }),
    organization: orgA,
    projectId: privateProject.id,
  });
  const ranged = await issues.list({
    filters: parseIssueListQuery({ number: "I-0002..I-0010" }),
    organization: orgA,
    projectId: privateProject.id,
  });
  check("issue number lookup returns that issue", byNumber.id === firstIssue.id);
  check("another workspace cannot read an issue by number", hiddenNumber?.status === 404);
  check(
    "a member who cannot see a private project cannot read its issue by number",
    privateHidden?.status === 404 && privateHidden.code === "PROJECT_NOT_FOUND",
  );
  check(
    "an issue number from another project is not found",
    otherProject?.status === 404 && otherProject.code === "ISSUE_NOT_FOUND",
  );
  check(
    "search by issue code returns that issue only",
    coded.issues.length === 1 && coded.issues[0]?.id === firstIssue.id,
  );
  check(
    "a code prefix can match I-0001",
    prefix.issues.some((item) => item.id === firstIssue.id),
  );
  check("a bare i- search does not match every issue", bareCode.issues.length === 0);
  check(
    "a code range uses numeric order",
    ranged.issues.length === 1 && ranged.issues[0]?.number === "2",
  );
  const counterProject = await projects.create({
    organization: orgA,
    request: {
      name: "Counter",
      slug: `counter-${crypto.randomUUID().slice(0, 8)}`,
      visibility: "workspace",
    },
  });
  const kept = await issues.create({
    organization: orgA,
    projectId: counterProject.id,
    request: { title: "Keep" },
  });
  const dropped = await issues.create({
    organization: orgA,
    projectId: counterProject.id,
    request: { title: "Drop" },
  });
  await issues.remove({
    issueId: dropped.id,
    organization: orgA,
    projectId: counterProject.id,
  });
  const reused = await issues.create({
    organization: orgA,
    projectId: counterProject.id,
    request: { title: "Next" },
  });
  const [concurrentLeft, concurrentRight] = await Promise.all([
    issues.create({
      organization: orgA,
      projectId: counterProject.id,
      request: { title: "Left" },
    }),
    issues.create({
      organization: orgA,
      projectId: counterProject.id,
      request: { title: "Right" },
    }),
  ]);
  check(
    "deleting the highest issue does not reuse its number",
    kept.number === "1" && dropped.number === "2" && reused.number === "3",
  );
  check(
    "concurrent creates receive different numbers",
    concurrentLeft.number !== concurrentRight.number,
  );
  await db.execute(sql`
    update project_issue_counter
    set last_number = 8
    where project_id = ${counterProject.id}::uuid
  `);
  const afterGap = await issues.create({
    organization: orgA,
    projectId: counterProject.id,
    request: { title: "Gap" },
  });
  check("the counter does not fill a gap", afterGap.number === "9");
  await db.execute(sql`
    update project_issue_counter
    set last_number = 9223372036854775807
    where project_id = ${counterProject.id}::uuid
  `);
  const exhausted = await rejected(() =>
    issues.create({
      organization: orgA,
      projectId: counterProject.id,
      request: { title: "Too far" },
    }),
  );
  check(
    "the bigint ceiling rejects the next issue",
    exhausted?.status === 409 && exhausted.code === "ISSUE_NUMBER_EXHAUSTED",
  );
  check(
    "newer issue sorts ahead in the same column",
    defaultColumn?.issues[0]?.id === secondIssue.id,
  );
  check(
    "member cannot create a column",
    await rejects(() =>
      statuses.create({
        organization: orgAMember,
        projectId: privateProject.id,
        request: { category: "started", name: "Review" },
      }),
    ),
  );
  check(
    "member cannot delete an issue",
    await rejects(() =>
      issues.remove({
        issueId: firstIssue.id,
        organization: orgAMember,
        projectId: privateProject.id,
      }),
    ),
  );
  if (todo !== undefined) {
    const moved = await issues.update({
      issueId: firstIssue.id,
      organization: orgAMember,
      projectId: privateProject.id,
      request: { statusId: todo.id },
    });
    check("member can move an issue to another column", moved.statusId === todo.id);
    await issues.update({
      issueId: firstIssue.id,
      organization: orgA,
      projectId: privateProject.id,
      request: { assigneeMemberIds: [memberC], priority: "high" },
    });
    await issues.update({
      issueId: secondIssue.id,
      organization: orgA,
      projectId: privateProject.id,
      request: { priority: "urgent" },
    });
    const callerIssues = await issues.list({
      filters: parseIssueListQuery({ assignee: "me" }),
      organization: orgAMember,
      projectId: privateProject.id,
    });
    const ownerIssues = await issues.list({
      filters: parseIssueListQuery({ assignee: "me" }),
      organization: orgA,
      projectId: privateProject.id,
    });
    const highIssues = await issues.list({
      filters: parseIssueListQuery({ priority: "high" }),
      organization: orgA,
      projectId: privateProject.id,
    });
    check(
      "me matches the caller rather than a stored member id",
      callerIssues.total === 1 && callerIssues.issues[0]?.id === firstIssue.id,
    );
    check(
      "me does not leak another member's assignments",
      ownerIssues.issues.every((issue) => issue.id !== firstIssue.id),
    );
    check(
      "high does not include urgent",
      highIssues.total === 1 && highIssues.issues[0]?.id === firstIssue.id,
    );
    const thirdIssue = await issues.create({
      organization: orgA,
      projectId: privateProject.id,
      request: { title: "Third" },
    });
    await issues.update({
      issueId: thirdIssue.id,
      organization: orgA,
      projectId: privateProject.id,
      request: { statusId: todo.id },
    });
    const topped = await issues.listBoard({ organization: orgA, projectId: privateProject.id });
    const todoColumn = topped.columns.find((column) => column.statusId === todo.id);
    check(
      "a status-only move places the issue at the top of the column",
      todoColumn?.issues[0]?.id === thirdIssue.id && todoColumn?.issues[1]?.id === firstIssue.id,
    );
    check(
      "a column that still has an issue cannot be deleted",
      await rejects(() =>
        statuses.remove({
          organization: orgA,
          projectId: privateProject.id,
          statusId: todo.id,
        }),
      ),
    );
  } else {
    check("member can move an issue to another column", false);
    check("a column that still has an issue cannot be deleted", false);
  }
  check(
    "the default column cannot be deleted",
    defaultStatus !== undefined &&
      (await rejects(() =>
        statuses.remove({
          organization: orgA,
          projectId: privateProject.id,
          statusId: defaultStatus.id,
        }),
      )),
  );
  try {
    await issues.remove({
      issueId: secondIssue.id,
      organization: orgA,
      projectId: privateProject.id,
    });
    check("owner can delete an issue", true);
  } catch {
    check("owner can delete an issue", false);
  }
  try {
    const added = await statuses.create({
      organization: orgA,
      projectId: privateProject.id,
      request: { category: "started", name: "Review" },
    });
    check("owner can add a column", added.name === "Review");
  } catch {
    check("owner can add a column", false);
  }

  const memberProject = await projects.create({
    organization: orgAMember,
    request: { name: "Solo", slug: "solo", visibility: "private" },
  });
  try {
    const leadColumn = await statuses.create({
      organization: orgAMember,
      projectId: memberProject.id,
      request: { category: "started", name: "QA" },
    });
    check("project lead can add a column", leadColumn.name === "QA");
  } catch {
    check("project lead can add a column", false);
  }
  const otherStatuses = await statuses.list({
    organization: orgA,
    projectId: memberProject.id,
  });
  const otherStatus = otherStatuses[0];
  check(
    "a status from another project is rejected",
    otherStatus !== undefined &&
      (await rejects(() =>
        issues.create({
          organization: orgA,
          projectId: privateProject.id,
          request: { statusId: otherStatus.id, title: "Cross" },
        }),
      )),
  );
  check(
    "sole project lead cannot demote themselves",
    await rejects(() =>
      projects.setMember({
        organization: orgAMember,
        projectId: memberProject.id,
        request: { memberId: memberC, role: "viewer" },
      }),
    ),
  );
  try {
    await projects.setMember({
      organization: orgA,
      projectId: memberProject.id,
      request: { memberId: memberC, role: "viewer" },
    });
    check("organization owner can recover the last lead", true);
  } catch {
    check("organization owner can recover the last lead", false);
  }
  check(
    "viewer cannot create an issue",
    await rejects(() =>
      issues.create({
        organization: orgAMember,
        projectId: memberProject.id,
        request: { title: "Nope" },
      }),
    ),
  );
  const notedContent = issueContentFromPlainText("Flight notes β");
  const noted =
    notedContent === null
      ? null
      : await issues.create({
          organization: orgA,
          projectId: memberProject.id,
          request: { content: notedContent, title: "Noted" },
        });
  const deniedContentUpdate =
    noted === null
      ? null
      : await rejected(() =>
          issues.update({
            issueId: noted.id,
            organization: orgAMember,
            projectId: memberProject.id,
            request: { title: "Changed" },
          }),
        );
  const preserved =
    noted === null
      ? null
      : await issues.update({
          issueId: noted.id,
          organization: orgA,
          projectId: memberProject.id,
          request: { title: "Noted again" },
        });
  const found =
    noted === null
      ? null
      : await issues.list({
          filters: parseIssueListQuery({ q: "flight notes" }),
          organization: orgA,
          projectId: memberProject.id,
        });
  const cleared =
    noted === null
      ? null
      : await issues.update({
          issueId: noted.id,
          organization: orgA,
          projectId: memberProject.id,
          request: { content: null },
        });

  check("a viewer cannot update an issue they can see", deniedContentUpdate?.status === 403);
  check(
    "a title patch preserves stored content",
    preserved !== null &&
      preserved.title === "Noted again" &&
      preserved.contentText === "Flight notes β" &&
      preserved.content !== null,
  );
  check(
    "content search uses the plain-text projection",
    found !== null &&
      found.issues.some((issue) => issue.id === noted?.id) &&
      found.issues.every((issue) => !("content" in issue)),
  );
  check(
    "clearing content removes the document",
    cleared !== null && cleared.content === null && cleared.contentText === "",
  );
  const personalView = await views.create({
    organization: orgAMember,
    projectId: memberProject.id,
    request: {
      definition: { filters: { timeZone: "UTC" }, version: 1 },
      name: "Mine",
      visibility: "personal",
    },
  });
  const hiddenView = await rejected(() =>
    views.get({ organization: orgA, projectId: memberProject.id, viewId: personalView.id }),
  );
  check(
    "a personal view is hidden from another member",
    hiddenView?.status === 404 && hiddenView.code === "ISSUE_VIEW_NOT_FOUND",
  );
  const deniedProjectView = await rejected(() =>
    views.create({
      organization: orgAMember,
      projectId: memberProject.id,
      request: {
        definition: { filters: { timeZone: "UTC" }, version: 1 },
        name: "Shared",
        visibility: "project",
      },
    }),
  );
  check("a viewer cannot create a project view", deniedProjectView?.status === 403);
  const sharedView = await views.create({
    organization: orgA,
    projectId: memberProject.id,
    request: {
      definition: { filters: { priorities: ["high"], timeZone: "UTC" }, version: 1 },
      name: "High priority",
      visibility: "project",
    },
  });
  const visibleViews = await views.list({
    limit: 50,
    offset: 0,
    organization: orgAMember,
    projectId: memberProject.id,
  });
  check(
    "a viewer can open a project view and their own personal view",
    visibleViews.views.some((view) => view.id === sharedView.id) &&
      visibleViews.views.some((view) => view.id === personalView.id) &&
      visibleViews.pagination.total === 2,
  );
  const searchedViews = await views.list({
    limit: 50,
    offset: 0,
    organization: orgAMember,
    projectId: memberProject.id,
    search: "HIGH",
  });
  const wildcardViews = await views.list({
    limit: 50,
    offset: 0,
    organization: orgAMember,
    projectId: memberProject.id,
    search: "%",
  });
  const hiddenSearch = await views.list({
    limit: 50,
    offset: 0,
    organization: orgA,
    projectId: memberProject.id,
    search: "Mine",
  });
  check(
    "view search matches a name inside the caller's visible views",
    searchedViews.pagination.total === 1 && searchedViews.views[0]?.id === sharedView.id,
  );
  check("view search treats a wildcard as a literal", wildcardViews.pagination.total === 0);
  check(
    "view search cannot reveal another member's personal view",
    hiddenSearch.views.every((view) => view.id !== personalView.id),
  );
  const deniedViewUpdate = await rejected(() =>
    views.update({
      organization: orgAMember,
      projectId: memberProject.id,
      request: { expectedRevision: sharedView.revision, name: "Nope" },
      viewId: sharedView.id,
    }),
  );
  check("a viewer cannot edit a project view", deniedViewUpdate?.status === 403);
  const renamedView = await views.update({
    organization: orgA,
    projectId: memberProject.id,
    request: { expectedRevision: sharedView.revision, name: "Needs attention" },
    viewId: sharedView.id,
  });
  const staleView = await rejected(() =>
    views.update({
      organization: orgA,
      projectId: memberProject.id,
      request: { expectedRevision: sharedView.revision, name: "Stale" },
      viewId: sharedView.id,
    }),
  );
  check(
    "a stale view revision conflicts",
    renamedView.revision === sharedView.revision + 1 &&
      staleView?.status === 409 &&
      staleView.code === "CONFLICT",
  );
  const deniedShare = await rejected(() =>
    views.update({
      organization: orgAMember,
      projectId: memberProject.id,
      request: { expectedRevision: personalView.revision, visibility: "project" },
      viewId: personalView.id,
    }),
  );
  check("a viewer cannot share a personal view with the project", deniedShare?.status === 403);
  const madePersonal = await views.update({
    organization: orgA,
    projectId: memberProject.id,
    request: { expectedRevision: renamedView.revision, visibility: "personal" },
    viewId: renamedView.id,
  });
  const hiddenShared = await views.list({
    limit: 50,
    offset: 0,
    organization: orgAMember,
    projectId: memberProject.id,
  });
  check(
    "changing a project view to personal hides it from other members",
    madePersonal.visibility === "personal" &&
      hiddenShared.views.every((view) => view.id !== renamedView.id),
  );
  const missingColumn = await rejected(() =>
    views.create({
      organization: orgA,
      projectId: memberProject.id,
      request: {
        definition: {
          filters: { statusIds: [crypto.randomUUID()], timeZone: "UTC" },
          version: 1,
        },
        name: "Missing column",
        visibility: "project",
      },
    }),
  );
  check(
    "a view cannot save a column from outside the project",
    missingColumn?.status === 404 && missingColumn.code === "PROJECT_STATUS_NOT_FOUND",
  );
  const foreignViews = await rejected(() =>
    views.list({ limit: 50, offset: 0, organization: orgB, projectId: memberProject.id }),
  );
  check(
    "another workspace cannot list project views",
    foreignViews?.status === 404 && foreignViews.code === "PROJECT_NOT_FOUND",
  );

  await verifyPagedIssues({ issues, orgA, orgAMember, orgB, projects, statuses });
}

try {
  await main();
} catch (error) {
  process.stdout.write(`UNEXPECTED ${String(error)}\n`);
  process.exitCode = 1;
} finally {
  await cleanup();
  await client.close();
}
