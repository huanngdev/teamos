import { describe, expect, test } from "vitest";
import type { IssueSummary, ProjectStatusSummary } from "@teamos/shared";

import { applyIssueMove, groupBoardColumns } from "./board-columns";

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

describe("applyIssueMove", () => {
  test("keeps the displayed slot after moving up or down in one column", () => {
    const issues = [
      issue("a", backlog.id, 0),
      issue("b", backlog.id, 1),
      issue("c", backlog.id, 2),
    ];

    expect(applyIssueMove(issues, "a", backlog.id, 1).map((item) => item.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(applyIssueMove(issues, "c", backlog.id, 1).map((item) => item.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  test("places an issue in another column at the previewed index", () => {
    const issues = [
      issue("a", backlog.id, 0),
      issue("b", backlog.id, 1),
      issue("c", todo.id, 0),
      issue("d", todo.id, 1),
    ];
    const columns = groupBoardColumns([backlog, todo], applyIssueMove(issues, "a", todo.id, 1));

    expect(columns[0]?.issues.map((item) => item.id)).toEqual(["b"]);
    expect(columns[1]?.issues.map((item) => item.id)).toEqual(["c", "a", "d"]);
  });
});
