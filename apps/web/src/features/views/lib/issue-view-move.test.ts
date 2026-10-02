import { describe, expect, test } from "vitest";

import { issueMatchesViewColumns, issueViewMoveRequest } from "./issue-view-move";

const issue = {
  assignee: null,
  assigneeMemberId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  id: "issue-1",
  number: 1,
  position: 2000,
  priority: "high" as const,
  statusId: "backlog",
  title: "Gate",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("issue view moves", () => {
  test("keeps a card where it was dropped in another column", () => {
    expect(
      issueViewMoveRequest({
        currentStatusId: "backlog",
        destinationIssues: [{ id: "a" }, { id: "b" }],
        destinationStatusId: "todo",
        index: 2,
        movingId: issue.id,
        skippedBefore: 0,
        sourceIndex: 0,
      }),
    ).toEqual({
      placement: { anchorIssueId: "b", type: "after" },
      statusId: "todo",
    });
  });

  test("reorders a card inside its column", () => {
    expect(
      issueViewMoveRequest({
        currentStatusId: "todo",
        destinationIssues: [{ id: issue.id }, { id: "a" }, { id: "b" }],
        destinationStatusId: "todo",
        index: 2,
        movingId: issue.id,
        skippedBefore: 0,
        sourceIndex: 0,
      }),
    ).toEqual({
      placement: { anchorIssueId: "b", type: "after" },
      statusId: "todo",
    });
  });

  test("uses the top only when the card is dropped first", () => {
    expect(
      issueViewMoveRequest({
        currentStatusId: "backlog",
        destinationIssues: [{ id: "a" }],
        destinationStatusId: "todo",
        index: 0,
        movingId: issue.id,
        skippedBefore: 0,
        sourceIndex: 1,
      }),
    ).toEqual({ placement: { type: "start" }, statusId: "todo" });
  });

  test("ignores a drop that does not move the card", () => {
    expect(
      issueViewMoveRequest({
        currentStatusId: "todo",
        destinationIssues: [{ id: issue.id }, { id: "a" }],
        destinationStatusId: "todo",
        index: 0,
        movingId: issue.id,
        skippedBefore: 0,
        sourceIndex: 0,
      }),
    ).toBeNull();
  });

  test("drops an issue from a view when the destination column is filtered out", () => {
    const definition = {
      filters: { statusIds: ["backlog"], timeZone: "UTC" },
      version: 1 as const,
    };

    expect(issueMatchesViewColumns({ statusId: "todo" }, definition, [])).toBe(false);
    expect(issueMatchesViewColumns(issue, definition, [])).toBe(true);
  });
});
