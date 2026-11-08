import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { expect, test } from "vitest";

import { issueTableOrder, toFacetCounts } from "../../../src/repositories/issues/queries.js";

const dialect = new PgDialect();

function requireSql(condition: SQL | undefined): SQL {
  if (condition === undefined) {
    throw new Error("Expected the builder to return a SQL condition.");
  }

  return condition;
}

test("issueTableOrder appends a stable id tie-breaker", () => {
  const [primary, tieBreaker] = issueTableOrder("createdAt", "desc");

  expect(dialect.sqlToQuery(requireSql(primary)).sql).toContain(`"issue"."created_at" desc`);
  expect(dialect.sqlToQuery(requireSql(tieBreaker)).sql).toContain(`"issue"."id" asc`);
});

test("issueTableOrder honors the direction for the primary sort", () => {
  const [primary] = issueTableOrder("title", "asc");

  expect(dialect.sqlToQuery(requireSql(primary)).sql).toContain(`lower("issue"."title") asc`);
});

test("issueTableOrder ranks priorities by their defined weight", () => {
  const [primary] = issueTableOrder("priority", "asc");
  const query = dialect.sqlToQuery(requireSql(primary));

  expect(query.sql).toContain("case");
  expect(query.params).toEqual(["none", 0, "low", 1, "medium", 2, "high", 3, "urgent", 4]);
});

test("issueTableOrder sorts categories by their display label", () => {
  const [primary] = issueTableOrder("category", "desc");
  const query = dialect.sqlToQuery(requireSql(primary));

  expect(query.sql).toContain("lower(case");
  expect(query.params).toContain("Backlog");
  expect(query.params).toContain("Completed");
});

test("issueTableOrder sorts assignees by the first display name in the column", () => {
  const [primary] = issueTableOrder("assignee", "asc");
  const query = dialect.sqlToQuery(requireSql(primary));

  expect(query.sql).toContain("coalesce");
  expect(query.sql).toContain("min(lower(");
});

test("issueTableOrder supports the remaining documented sorts", () => {
  const sorts = ["content", "number", "status", "updatedAt"] as const;

  for (const sort of sorts) {
    const [primary] = issueTableOrder(sort, "desc");

    expect(dialect.sqlToQuery(requireSql(primary)).sql.length).toBeGreaterThan(0);
  }
});

test("toFacetCounts groups values by id and drops unkeyed rows", () => {
  expect(
    toFacetCounts([
      { id: "status-1", value: 2 },
      { id: null, value: 3 },
    ]),
  ).toEqual({ "status-1": 2 });
});

test("toFacetCounts assigns unkeyed rows to the provided null key", () => {
  expect(toFacetCounts([{ id: null, value: "4" }], "unassigned")).toEqual({ unassigned: 4 });
});

test("toFacetCounts returns an empty record for no rows", () => {
  expect(toFacetCounts([])).toEqual({});
});
