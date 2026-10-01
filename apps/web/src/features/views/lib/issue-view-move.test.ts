import { describe, expect, test } from "vitest";

import {
  issueMatchesViewColumns,
  issueViewStatusMoveRequest,
  placeIssueAtColumnTop,
} from "./issue-view-move";

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
  test("changes status without sending a filtered index", () => {
    expect(issueViewStatusMoveRequest("backlog", "todo")).toEqual({ statusId: "todo" });
    expect(issueViewStatusMoveRequest("todo", "todo")).toBeNull();
  });

  test("places a moved issue ahead of hidden cards in the destination column", () => {
    const hidden = { ...issue, id: "hidden", position: 0, statusId: "todo" };
    const visible = { ...issue, id: "visible", position: 1000, statusId: "todo" };
    const placed = placeIssueAtColumnTop([issue, hidden, visible], issue.id, "todo");
    const todo = placed
      .filter((item) => item.statusId === "todo")
      .sort((left, right) => left.position - right.position);

    expect(todo.map((item) => item.id)).toEqual(["issue-1", "hidden", "visible"]);
    expect(placed.find((item) => item.id === "issue-1")?.position).toBeLessThan(hidden.position);
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
