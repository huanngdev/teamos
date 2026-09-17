import { createDatabase } from "@teamos/db";
import { sql } from "drizzle-orm";

import { createOrganizationAccessService } from "../src/auth/organization-access.js";
import { createOrganizationMemberService } from "../src/services/organization-members.js";
import { createProjectService } from "../src/services/projects.js";

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
};

const memberA = `${ids.orgA}-m-a`;
const memberC = `${ids.orgA}-m-c`;
const memberB = `${ids.orgB}-m-b`;

async function seed() {
  const now = new Date();

  for (const [userId, email] of [
    [ids.userA, "verify-a@example.com"],
    [ids.userB, "verify-b@example.com"],
    [ids.userC, "verify-c@example.com"],
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
}

async function cleanup() {
  await db.execute(sql`delete from organization where id in (${ids.orgA}, ${ids.orgB})`);
  await db.execute(sql`delete from "user" where id in (${ids.userA}, ${ids.userB}, ${ids.userC})`);
}

function check(label: string, condition: boolean) {
  process.stdout.write(`${condition ? "PASS" : "FAIL"} ${label}\n`);
  if (!condition) {
    process.exitCode = 1;
  }
}

async function rejects(action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action();
    return false;
  } catch {
    return true;
  }
}

async function main() {
  await client.connect();
  await cleanup();
  await seed();

  const access = createOrganizationAccessService(db);
  const members = createOrganizationMemberService(db);
  const projects = createProjectService({ db, members });

  const orgA = await access.resolve({ organizationSlug: ids.orgA, userId: ids.userA });
  const orgB = await access.resolve({ organizationSlug: ids.orgB, userId: ids.userB });
  const orgAMember = await access.resolve({ organizationSlug: ids.orgA, userId: ids.userC });

  check("owner resolves the organization", orgA !== undefined && orgB !== undefined);
  check("plain member resolves the organization", orgAMember !== undefined);
  if (orgA === undefined || orgB === undefined || orgAMember === undefined) {
    return;
  }

  check("counts workspace members", (await members.count(orgA.organizationId)) === 2);
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
  check(
    "project lead cannot delete a project",
    await rejects(() =>
      projects.remove({ organization: orgAMember, projectId: workspaceProject.id }),
    ),
  );
  try {
    await projects.remove({ organization: orgA, projectId: workspaceProject.id });
    check("owner can delete a project", true);
  } catch {
    check("owner can delete a project", false);
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

  const memberProject = await projects.create({
    organization: orgAMember,
    request: { name: "Solo", slug: "solo", visibility: "private" },
  });
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
