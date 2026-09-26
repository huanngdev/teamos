import { describe, expect, test } from "vitest";
import type { IssueSummary, ProjectStatusSummary } from "@teamos/shared";

import {
  columnDropIndex,
  columnDropSlot,
  groupBoardColumns,
  issueDropSlot,
  issueDropTarget,
} from "./board-columns";

const backlog: ProjectStatusSummary = {
  category: "backlog",
  id: "11111111-1111-4111-8111-111111111111",
  isDefault: true,
  name: "Backlog",
  position: 0,
};

const todo: ProjectStatusSummary = {
  category: "unstarted",
  id: "22222222-2222-4222-8222-222222222222",
  isDefault: false,
  name: "Todo",
  position: 1000,
};

function issue(id: string, statusId: string, position: number): IssueSummary {
  return {
    assigneeMemberId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    description: null,
    id,
    number: position + 1,
    position,
    priority: "none",
    statusId,
    title: id,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("groupBoardColumns", () => {
  test("sorts columns and the cards inside them", () => {
    const columns = groupBoardColumns(
      [todo, backlog],
      [issue("b", backlog.id, 2), issue("a", backlog.id, 1), issue("c", todo.id, 0)],
    );

    expect(columns.map((column) => column.status.name)).toEqual(["Backlog", "Todo"]);
    expect(columns[0]?.issues.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("issueDropTarget", () => {
  test("drops a card on another column at the requested index", () => {
    const columns = groupBoardColumns(
      [backlog, todo],
      [issue("a", backlog.id, 0), issue("b", todo.id, 0)],
    );

    expect(issueDropTarget(columns, "a", "b")).toEqual({ index: 0, statusId: todo.id });
  });

  test("ignores a drop back on the same card", () => {
    const columns = groupBoardColumns([backlog], [issue("a", backlog.id, 0)]);

    expect(issueDropTarget(columns, "a", "a")).toBeNull();
  });
});

describe("issueDropSlot", () => {
  test("inserts after the hovered card when the pointer is in its lower half", () => {
    const columns = groupBoardColumns(
      [backlog],
      [issue("a", backlog.id, 0), issue("b", backlog.id, 1)],
    );

    expect(issueDropSlot(columns, "a", "b", true)).toEqual({ index: 1, statusId: backlog.id });
    expect(issueDropSlot(columns, "a", "b")).toEqual({ index: 0, statusId: backlog.id });
  });
});

describe("columnDropSlot", () => {
  test("inserts after the hovered column when the pointer is in its right half", () => {
    const columns = groupBoardColumns([backlog, todo], []);

    expect(columnDropSlot(columns, backlog.id, todo.id, true)).toBe(1);
    expect(columnDropSlot(columns, backlog.id, todo.id)).toBeNull();
  });
});

describe("columnDropIndex", () => {
  test("returns the over column index", () => {
    const columns = groupBoardColumns([backlog, todo], []);

    expect(columnDropIndex(columns, backlog.id, todo.id)).toBe(1);
    expect(columnDropIndex(columns, backlog.id, backlog.id)).toBeNull();
  });
});
