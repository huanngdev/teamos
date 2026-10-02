import { cpus, platform, totalmem } from "node:os";

import { createDatabase } from "@teamos/db";
import { parseIssueListQuery } from "@teamos/shared";
import { sql } from "drizzle-orm";

import { createOrganizationAccessService } from "../src/auth/organization-access.js";
import { createIssueService } from "../src/services/issues.js";
import { createOrganizationMemberService } from "../src/services/organization-members.js";
import { createProjectService } from "../src/services/projects.js";
import { createProjectStatusService } from "../src/services/project-statuses.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://teamos_user:teamos_password@localhost:5432/teamos";

const scales = (process.env.BENCHMARK_ISSUES ?? "10000,100000")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value >= 1_000 && value <= 100_000);

const client = createDatabase({ connectionString: DATABASE_URL });
const db = client.db;

/*
 * Local-only measurement for paged issue reads and anchor moves. It creates a
 * throwaway organization and deletes only that organization. It does not touch
 * existing workspace data. A green result is a measurement, not a support claim.
 */
async function main() {
  if (scales.length === 0) {
    throw new Error("Set BENCHMARK_ISSUES to one or more counts between 1000 and 100000.");
  }

  await client.connect();
  const cpu = cpus()[0];

  process.stdout.write(
    `${JSON.stringify({
      concurrency: 4,
      cpu: cpu?.model ?? "unknown",
      database: "local-postgresql",
      memoryMb: Math.round(totalmem() / (1024 * 1024)),
      platform: platform(),
      runtime: `bun ${process.versions.bun ?? "unknown"}`,
      scales,
    })}\n`,
  );

  for (const count of scales) {
    await measure(count);
  }
}

async function measure(count: number) {
  const suffix = crypto.randomUUID();
  const orgId = `bench-org-${suffix}`;
  const userId = `bench-user-${suffix}`;
  const memberId = `${orgId}-owner`;

  try {
    const now = new Date();

    await db.execute(
      sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
          values (${userId}, 'Bench', ${`${userId}@example.com`}, true, ${now}, ${now})`,
    );
    await db.execute(
      sql`insert into organization (id, name, slug, created_at)
          values (${orgId}, 'Bench', ${orgId}, ${now})`,
    );
    await db.execute(
      sql`insert into member (id, organization_id, user_id, role, created_at)
          values (${memberId}, ${orgId}, ${userId}, 'owner', ${now})`,
    );

    const access = createOrganizationAccessService(db);
    const organization = await access.resolve({ organizationSlug: orgId, userId });

    if (organization === undefined) {
      throw new Error("Benchmark organization did not resolve.");
    }

    const projects = createProjectService({
      db,
      members: createOrganizationMemberService(db),
    });
    const issues = createIssueService({
      db,
      members: createOrganizationMemberService(db),
    });
    const statuses = createProjectStatusService(db);
    const project = await projects.create({
      organization,
      request: { name: "Bench", slug: `bench-${suffix.slice(0, 8)}`, visibility: "private" },
    });
    const projectStatuses = await statuses.list({ organization, projectId: project.id });
    const skewed = projectStatuses[0];
    const other = projectStatuses[1];

    if (skewed === undefined || other === undefined) {
      throw new Error("Benchmark project did not seed columns.");
    }

    const inserted = await timed(async () => {
      await db.execute(sql`
        insert into issue (
          organization_id, project_id, status_id, number, title, description, priority, position,
          created_by_member_id, updated_by_member_id, created_at, updated_at
        )
        select
          ${organization.organizationId},
          ${project.id}::uuid,
          case when g % 10 = 0 then ${other.id}::uuid else ${skewed.id}::uuid end,
          g::int,
          case when g % 100 = 0 then 'gate ' || g::text else 'Issue ' || g::text end,
          repeat('note ', 40),
          'none',
          (g * 1000)::int,
          ${memberId},
          ${memberId},
          now() - (g || ' seconds')::interval,
          now()
        from generate_series(1, ${count}::int) as g
      `);
    });
    const deepOffset = Math.max(0, count - 20);
    const middlePosition = Math.floor(count / 2) * 1000;
    const tablePlan = await explain(sql`
      select id
      from issue
      where organization_id = ${organization.organizationId}
        and project_id = ${project.id}::uuid
      order by created_at desc, id asc
      limit 20 offset ${deepOffset}::int
    `);
    const columnPlan = await explain(sql`
      select id
      from issue
      where organization_id = ${organization.organizationId}
        and project_id = ${project.id}::uuid
        and status_id = ${skewed.id}::uuid
        and (position, id) > (${middlePosition}::int, '00000000-0000-4000-8000-000000000000'::uuid)
      order by position asc, id asc
      limit 41
    `);
    const countPlan = await explain(sql`
      select status_id, count(*)
      from issue
      where organization_id = ${organization.organizationId}
        and project_id = ${project.id}::uuid
      group by status_id
    `);
    const searchPlan = await explain(sql`
      select id
      from issue
      where organization_id = ${organization.organizationId}
        and project_id = ${project.id}::uuid
        and position('gate' in lower(title)) > 0
      order by created_at desc, id asc
      limit 20
    `);
    const listed = await timed(async () =>
      issues.list({
        organization,
        page: Math.floor(deepOffset / 20) + 1,
        pageSize: 20,
        projectId: project.id,
        sort: "createdAt",
      }),
    );
    const column = await timed(async () =>
      issues.listColumn({
        before: false,
        cursor: undefined,
        limit: 40,
        organization,
        projectId: project.id,
        statusId: skewed.id,
      }),
    );
    const searched = await timed(async () =>
      issues.list({
        filters: parseIssueListQuery({ q: "gate" }),
        organization,
        page: 1,
        pageSize: 20,
        projectId: project.id,
      }),
    );
    const board = await timed(async () =>
      issues.listBoard({ organization, projectId: project.id }),
    );
    const sample = column.value.issues[10];
    const anchor = column.value.issues[11];
    let moveRows = 0;
    let moveMs = 0;

    if (sample !== undefined && anchor !== undefined) {
      const before = await readPositions(organization.organizationId, project.id, skewed.id);
      const move = await timed(async () =>
        issues.update({
          issueId: sample.id,
          organization,
          projectId: project.id,
          request: { placement: { anchorIssueId: anchor.id, type: "after" } },
        }),
      );
      const after = await readPositions(organization.organizationId, project.id, skewed.id);

      moveMs = move.ms;
      moveRows = [...after].filter(([id, position]) => before.get(id) !== position).length;
      void move.value;
    }

    const concurrentIds = column.value.issues.slice(0, 4).map((issue) => issue.id);
    const concurrent = await timed(async () => {
      await Promise.all(
        concurrentIds.map((issueId, index) =>
          issues.update({
            issueId,
            organization,
            projectId: project.id,
            request: { title: `Moved ${index}` },
          }),
        ),
      );
    });

    process.stdout.write(
      `${JSON.stringify({
        boardMs: board.ms,
        boardRequests: 1,
        columnFirstPageBytes: JSON.stringify(column.value).length,
        columnFirstPageMs: column.ms,
        columnPlan,
        countPlan,
        dataset: count,
        deepPageBytes: JSON.stringify(listed.value).length,
        deepPageMs: listed.value.issues.length === 0 ? null : listed.ms,
        deepPageRows: listed.value.issues.length,
        insertMs: inserted.ms,
        lockHoldMs: null,
        moveRowsUpdated: moveRows,
        moveWallMs: moveMs,
        concurrentMoveMs: concurrent.ms,
        concurrentMoves: concurrentIds.length,
        notes: [
          "Offset paging walks skipped rows. The deep-page plan is the evidence.",
          "moveRowsUpdated counts issue rows whose position changed. A normal gap updates one row.",
          "lockHoldMs is not sampled from pg_locks. moveWallMs includes the project share lock and the column advisory lock.",
          "Browser DOM and heap were not measured by this script.",
        ],
        searchMs: searched.ms,
        searchPlan,
        searchTotal: searched.value.total,
        skewedColumnCards: board.value.columns.find((item) => item.statusId === skewed.id)?.issues
          .length,
        skewedColumnTotal: board.value.columns.find((item) => item.statusId === skewed.id)?.total,
        tablePlan,
      })}\n`,
    );
  } finally {
    await db.execute(sql`delete from organization where id = ${orgId}`);
    await db.execute(sql`delete from "user" where id = ${userId}`);
  }
}

async function explain(query: ReturnType<typeof sql>): Promise<string> {
  const result = await db.execute(sql`explain (analyze, buffers) ${query}`);
  const lines = rowsOf(result)
    .map((row) => {
      const plan = row["QUERY PLAN"];

      return typeof plan === "string" ? plan.trim() : "";
    })
    .filter((line) => line.length > 0);
  const kept = lines.filter((line) =>
    /Scan|Limit|Execution Time|Planning Time|Sort |GroupAggregate|Buffers:/.test(line),
  );

  return (kept.length > 0 ? kept : lines).slice(0, 6).join(" | ");
}

async function readPositions(
  organizationId: string,
  projectId: string,
  statusId: string,
): Promise<Map<string, number>> {
  const result = await db.execute(sql`
    select id::text as id, position
    from issue
    where organization_id = ${organizationId}
      and project_id = ${projectId}::uuid
      and status_id = ${statusId}::uuid
  `);

  return new Map(rowsOf(result).map((row) => [String(row.id), Number(row.position)]));
}

async function timed<T>(action: () => Promise<T>): Promise<{ ms: number; value: T }> {
  const started = performance.now();
  const value = await action();

  return { ms: Math.round(performance.now() - started), value };
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) {
    return result as Record<string, unknown>[];
  }

  if (
    typeof result === "object" &&
    result !== null &&
    "rows" in result &&
    Array.isArray(result.rows)
  ) {
    return result.rows as Record<string, unknown>[];
  }

  return [];
}

try {
  await main();
} catch (error) {
  process.stdout.write(`UNEXPECTED ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await client.close();
}
