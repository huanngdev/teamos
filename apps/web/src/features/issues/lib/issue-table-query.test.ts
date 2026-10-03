import { expect, test } from "vitest";
import type { IssueSummary, ProjectMember, ProjectStatusSummary } from "@teamos/shared";

import {
  buildIssueTableRows,
  defaultIssueTableQuery,
  issueTableColumnIds,
  issueListRequestParams,
  issueTableHasFilters,
  localDateKey,
  matchesDateRange,
  matchesIssueSearch,
  matchesNumberRange,
  moveIssueTableColumn,
  parseIssueTableSearch,
  serializeIssueTableSearch,
  visiblePageIndexes,
  type IssueTableRow,
} from "./issue-table-query";

const backlog: ProjectStatusSummary = {
  category: "backlog",
  id: "11111111-1111-4111-8111-111111111111",
  isDefault: true,
  name: "Backlog",
  position: 0,
};

const member: ProjectMember = {
  email: "ada@example.com",
  image: null,
  memberId: "member-1",
  name: "Ada Lovelace",
  role: "lead",
  userId: "user-1",
};

function issue(overrides: Partial<IssueSummary> = {}): IssueSummary {
  return {
    assignees: [],
    contentText: "Gate check",
    createdAt: "2026-01-15T08:00:00.000Z",
    id: "issue-1",
    number: "12",
    position: 0,
    priority: "high",
    statusId: backlog.id,
    title: "Check the gate",
    updatedAt: "2026-01-16T08:00:00.000Z",
    ...overrides,
  };
}

function row(overrides: Partial<IssueTableRow> = {}): IssueTableRow {
  return {
    assigneeEmail: "ada@example.com",
    assigneeIds: ["member-1"],
    assigneeName: "Ada Lovelace",
    assignees: [
      {
        email: "ada@example.com",
        id: "member-1",
        image: null,
        name: "Ada Lovelace",
      },
    ],
    category: "backlog",
    createdAt: "2026-01-15T08:00:00.000Z",
    contentText: "Gate check",
    id: "issue-1",
    issue: issue(),
    number: "12",
    priority: "high",
    statusId: backlog.id,
    statusName: "Backlog",
    statusPosition: 0,
    title: "Check the gate",
    updatedAt: "2026-01-16T08:00:00.000Z",
    ...overrides,
  };
}

test("omits the default sort, page, and page size from the URL", () => {
  expect(serializeIssueTableSearch(defaultIssueTableQuery()).toString()).toBe("");
  expect(parseIssueTableSearch(new URLSearchParams()).sorting).toEqual([
    { desc: true, id: "createdAt" },
  ]);
  expect(parseIssueTableSearch(new URLSearchParams("sort=nope.asc")).sorting).toEqual([
    { desc: true, id: "createdAt" },
  ]);
});

test("round-trips search, sort, paging, and filters", () => {
  const query = parseIssueTableSearch(
    new URLSearchParams(
      "q=gate&sort=priority.asc&page=2&pageSize=10&status=abc&priority=high,nope&assignee=unassigned&title=orbit&number=2..&created=2026-01-01..&hide=&cols=title",
    ),
  );

  expect(query.q).toBe("gate");
  expect(query.pageIndex).toBe(1);
  expect(query.pageSize).toBe(10);
  expect(query.sorting).toEqual([{ desc: false, id: "priority" }]);
  expect(query.columnFilters).toEqual([
    { id: "status", value: ["abc"] },
    { id: "priority", value: ["high"] },
    { id: "assignee", value: ["unassigned"] },
    { id: "title", value: "orbit" },
    { id: "number", value: ["2", undefined] },
    { id: "createdAt", value: ["2026-01-01", undefined] },
  ]);
  expect(query.columnVisibility).toEqual({});
  expect(query.columnOrder[0]).toBe("title");
  expect(query.columnOrder).toHaveLength(issueTableColumnIds.length);
  expect(parseIssueTableSearch(serializeIssueTableSearch(query))).toEqual(query);
});

test("sends filters, sort, and the page to the list request", () => {
  const query = parseIssueTableSearch(
    new URLSearchParams("q=gate&priority=urgent&page=2&sort=title.asc"),
  );
  const params = issueListRequestParams(query, "UTC");

  expect(params).toEqual({
    direction: "asc",
    facets: "1",
    page: "2",
    pageSize: "20",
    priority: "urgent",
    q: "gate",
    sort: "title",
    timeZone: "UTC",
  });
});

test("rejects invalid ranges and cannot hide the title", () => {
  const query = parseIssueTableSearch(
    new URLSearchParams("number=1..2..3&created=2026-02-31..nope&hide=title,category"),
  );

  expect(query.columnFilters).toEqual([]);
  expect(query.columnVisibility).toEqual({ category: false });
});

test("builds rows for missing columns and members", () => {
  const rows = buildIssueTableRows(
    [
      issue({
        assignees: [{ email: "", id: "missing-member", image: null, name: "" }],
        statusId: "missing-status",
      }),
      issue({
        assignees: [
          {
            email: "ada@example.com",
            id: "member-1",
            image: null,
            name: "Ada Lovelace",
          },
        ],
        id: "issue-2",
        number: "13",
      }),
      issue({ id: "issue-3", number: "14" }),
    ],
    [backlog],
    [member],
  );

  expect(rows[0]).toMatchObject({
    assigneeName: "Unknown member",
    category: null,
    statusName: "Unknown column",
    statusPosition: Number.MAX_SAFE_INTEGER,
  });
  expect(rows[1]).toMatchObject({
    assigneeEmail: "ada@example.com",
    assigneeName: "Ada Lovelace",
    statusName: "Backlog",
  });
  expect(rows[2]).toMatchObject({ assigneeIds: ["unassigned"], assigneeName: "Unassigned" });
});

test("matches search text and local calendar dates", () => {
  expect(matchesIssueSearch(row(), "#12")).toBe(true);
  expect(matchesIssueSearch(row(), "I-0012")).toBe(true);
  expect(matchesIssueSearch(row(), "i-001")).toBe(true);
  expect(matchesIssueSearch(row(), "i-")).toBe(false);
  expect(matchesIssueSearch(row(), "high")).toBe(true);
  expect(matchesIssueSearch(row(), "ada@example.com")).toBe(true);
  expect(matchesIssueSearch(row(), "missing")).toBe(false);

  const stamp = new Date(2026, 0, 15, 15, 30).toISOString();

  expect(localDateKey(stamp)).toBe("2026-01-15");
  expect(matchesDateRange(stamp, ["2026-01-15", "2026-01-15"])).toBe(true);
  expect(matchesDateRange(stamp, ["2026-01-16", undefined])).toBe(false);
  expect(matchesNumberRange("3", ["1", undefined])).toBe(true);
  expect(matchesNumberRange("3", ["4", "8"])).toBe(false);
  expect(matchesNumberRange("10", ["2", undefined])).toBe(true);
  expect(matchesNumberRange("2", [undefined, "10"])).toBe(true);
});

test("moves columns and windows page numbers", () => {
  expect(moveIssueTableColumn(issueTableColumnIds, "title", "start")[0]).toBe("title");
  expect(moveIssueTableColumn(issueTableColumnIds, "number", "left")).toEqual([
    ...issueTableColumnIds,
  ]);
  expect(visiblePageIndexes(0, 0)).toEqual([]);
  expect(visiblePageIndexes(3, 1)).toEqual([0, 1, 2]);
  expect(visiblePageIndexes(10, 9)).toEqual([3, 4, 5, 6, 7, 8, 9]);
  expect(issueTableHasFilters(defaultIssueTableQuery())).toBe(false);
  expect(issueTableHasFilters({ ...defaultIssueTableQuery(), q: "gate" })).toBe(true);
});
