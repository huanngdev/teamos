import { describe, expect, test } from "bun:test";

import { parseIssueListQuery, resolveCurrentUserAssignee } from "./issue-list-query.js";

const statusId = "11111111-1111-4111-8111-111111111111";

describe("parseIssueListQuery", () => {
  test("treats an empty query as an unfiltered list", () => {
    const filters = parseIssueListQuery({});

    expect(filters.unsatisfiable).toBe(false);
    expect(filters.includeFacets).toBe(false);
    expect(filters.q).toBeUndefined();
    expect(filters.priorities).toEqual([]);
    expect(filters.timeZone).toBe("UTC");
  });

  test("keeps valid filter tokens and drops invalid ones", () => {
    const filters = parseIssueListQuery({
      assignee: "unassigned, member-1",
      category: "started,review",
      created: "2026-01-01..2026-02-31",
      facets: "1",
      number: "2..",
      priority: "high,nope",
      q: "  gate  ",
      status: `${statusId},not-a-uuid`,
      timeZone: "Asia/Ho_Chi_Minh",
      title: " orbit ",
    });

    expect(filters.unsatisfiable).toBe(false);
    expect(filters.includeFacets).toBe(true);
    expect(filters.includeUnassigned).toBe(true);
    expect(filters.assignees).toEqual(["member-1"]);
    expect(filters.categories).toEqual(["started"]);
    expect(filters.priorities).toEqual(["high"]);
    expect(filters.statusIds).toEqual([statusId]);
    expect(filters.numberMin).toBe(2);
    expect(filters.numberMax).toBeUndefined();
    expect(filters.createdFrom).toBe("2026-01-01");
    expect(filters.createdTo).toBeUndefined();
    expect(filters.q).toBe("gate");
    expect(filters.title).toBe("orbit");
    expect(filters.timeZone).toBe("Asia/Ho_Chi_Minh");
  });

  test("is unsatisfiable when every requested token is invalid", () => {
    expect(parseIssueListQuery({ priority: "nope" }).unsatisfiable).toBe(true);
    expect(parseIssueListQuery({ status: "not-a-uuid" }).unsatisfiable).toBe(true);
  });

  test("ignores an invalid time zone", () => {
    expect(parseIssueListQuery({ timeZone: "Not/AZone" }).timeZone).toBe("UTC");
  });

  test("keeps me symbolic until the caller is known", () => {
    const filters = parseIssueListQuery({ assignee: "me,unassigned,member-1" });

    expect(filters.includeCurrentUser).toBe(true);
    expect(filters.includeUnassigned).toBe(true);
    expect(filters.assignees).toEqual(["member-1"]);
    expect(filters.unsatisfiable).toBe(false);
  });
});

describe("resolveCurrentUserAssignee", () => {
  test("resolves me to the caller and does not duplicate an explicit member id", () => {
    const resolved = resolveCurrentUserAssignee(
      parseIssueListQuery({ assignee: "me,member-1" }),
      "member-1",
    );

    expect(resolved.includeCurrentUser).toBe(false);
    expect(resolved.assignees).toEqual(["member-1"]);
  });

  test("leaves an unresolved me filter closed", () => {
    const filters = parseIssueListQuery({ assignee: "me" });

    expect(resolveCurrentUserAssignee(filters, "").includeCurrentUser).toBe(true);
  });
});
