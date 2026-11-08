import { parseIssueListQuery } from "@teamos/shared";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { expect, test } from "vitest";

import { buildIssueListWhere, dateBounds } from "../../../src/repositories/issues/filters.js";
import { issue } from "../../../src/schema/index.js";

const dialect = new PgDialect();

function requireSql(condition: SQL | undefined): SQL {
  if (condition === undefined) {
    throw new Error("Expected the builder to return a SQL condition.");
  }

  return condition;
}

test("buildIssueListWhere scopes every query to the organization and project", () => {
  const where = requireSql(buildIssueListWhere("org-1", "project-1", parseIssueListQuery({})));
  const query = dialect.sqlToQuery(where);

  expect(query.sql).toContain(`"issue"."organization_id" = $1`);
  expect(query.sql).toContain(`"issue"."project_id" = $2`);
  expect(query.params).toEqual(["org-1", "project-1"]);
});

test("buildIssueListWhere closes an unresolved filter instead of dropping it", () => {
  const filters = { ...parseIssueListQuery({}), unsatisfiable: true };
  const query = dialect.sqlToQuery(requireSql(buildIssueListWhere("org-1", "project-1", filters)));

  expect(query.sql).toContain("false");
});

test("buildIssueListWhere closes an unresolved current-user assignee", () => {
  const filters = { ...parseIssueListQuery({}), includeCurrentUser: true };
  const query = dialect.sqlToQuery(requireSql(buildIssueListWhere("org-1", "project-1", filters)));

  expect(query.sql).toContain("false");
});

test("buildIssueListWhere selects unassigned issues with a not-exists predicate", () => {
  const filters = { ...parseIssueListQuery({}), includeUnassigned: true };
  const query = dialect.sqlToQuery(requireSql(buildIssueListWhere("org-1", "project-1", filters)));

  expect(query.sql).toContain("not exists");
  expect(query.sql).toContain(`"issue_assignee"."issue_id" = "issue"."id"`);
});

test("buildIssueListWhere matches selected assignees", () => {
  const filters = { ...parseIssueListQuery({}), assignees: ["member-1", "member-2"] };
  const query = dialect.sqlToQuery(requireSql(buildIssueListWhere("org-1", "project-1", filters)));

  expect(query.sql).toContain(`"issue_assignee"."member_id" in ($3, $4)`);
  expect(query.params).toEqual(["org-1", "project-1", "member-1", "member-2"]);
});

test("buildIssueListWhere applies coded and numeric filters", () => {
  const filters = {
    ...parseIssueListQuery({}),
    categories: ["started" as const],
    numberMax: "42",
    numberMin: "7",
    priorities: ["high" as const],
    statusIds: ["status-1"],
  };
  const query = dialect.sqlToQuery(requireSql(buildIssueListWhere("org-1", "project-1", filters)));

  expect(query.sql).toContain(`"issue"."status_id" in`);
  expect(query.sql).toContain(`"issue"."priority" in`);
  expect(query.sql).toContain(`"project_status"."category" in`);
  expect(query.sql).toContain(`"issue"."number" >=`);
  expect(query.sql).toContain(`"issue"."number" <=`);
  expect(query.params).toContain("7");
  expect(query.params).toContain("42");
});

test("buildIssueListWhere searches without wildcard semantics", () => {
  const filters = {
    ...parseIssueListQuery({}),
    content: "50%",
    title: "Deploy",
  };
  const query = dialect.sqlToQuery(requireSql(buildIssueListWhere("org-1", "project-1", filters)));

  expect(query.sql).toContain("position(");
  expect(query.sql).not.toContain("like");
  expect(query.params).toContain("deploy");
  expect(query.params).toContain("50%");
});

test("buildIssueListWhere combines the text, code, label, and date predicates of q", () => {
  const filters = parseIssueListQuery({
    created: "2026-01-01..2026-01-31",
    q: "i-0001",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const query = dialect.sqlToQuery(requireSql(buildIssueListWhere("org-1", "project-1", filters)));

  expect(query.sql).toContain(`lower("issue"."title")`);
  expect(query.sql).toContain(`lower("issue"."content_text")`);
  expect(query.sql).toContain(`lower("project_status"."name")`);
  expect(query.sql).toContain("lpad(");
  expect(query.sql).toContain("at time zone");
  expect(query.params).toContain("Asia/Ho_Chi_Minh");
  expect(query.params).toContain("i-0001");
  expect(query.params).toContain("2026-01-01");
  expect(query.params).toContain("2026-01-31");
});

test("dateBounds returns undefined without both bounds", () => {
  expect(dateBounds(issue.createdAt, "UTC", undefined, undefined)).toBeUndefined();
});

test("dateBounds localizes a single lower bound", () => {
  const query = dialect.sqlToQuery(
    requireSql(dateBounds(issue.updatedAt, "Europe/Paris", "2026-03-01", undefined)),
  );

  expect(query.sql).toContain("at time zone");
  expect(query.sql).toContain(">=");
  expect(query.sql).not.toContain("<=");
  expect(query.params).toEqual(["Europe/Paris", "2026-03-01"]);
});

test("dateBounds localizes both bounds", () => {
  const query = dialect.sqlToQuery(
    requireSql(dateBounds(issue.createdAt, "UTC", "2026-03-01", "2026-03-31")),
  );

  expect(query.sql).toContain(">=");
  expect(query.sql).toContain("<=");
  expect(query.params).toEqual(["UTC", "2026-03-01", "UTC", "2026-03-31"]);
});
