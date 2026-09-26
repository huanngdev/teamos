import { ISSUE_BOARD_MAX } from "@teamos/shared";
import { describe, expect, test } from "vitest";

import { SEED_ISSUES_PER_COLUMN, planSeedIssues } from "./seed-issues";

const columns = ["backlog", "todo", "done"];

describe("planSeedIssues", () => {
  test("gives every existing column the same number of issues", () => {
    const plan = planSeedIssues(columns, 0);

    expect(plan.status).toBe("ready");

    if (plan.status !== "ready") {
      return;
    }

    expect(plan.slots).toHaveLength(columns.length * SEED_ISSUES_PER_COLUMN);
    expect(plan.slots.filter((statusId) => statusId === "todo")).toHaveLength(
      SEED_ISSUES_PER_COLUMN,
    );
  });

  test("spreads the remaining room instead of filling one column", () => {
    const plan = planSeedIssues(columns, ISSUE_BOARD_MAX - 4);

    expect(plan).toEqual({
      slots: ["backlog", "todo", "done", "backlog"],
      status: "ready",
    });
  });

  test("skips when there is no column or the board is full", () => {
    expect(planSeedIssues([], 0)).toEqual({ reason: "empty", status: "skipped" });
    expect(planSeedIssues(columns, ISSUE_BOARD_MAX)).toEqual({ reason: "full", status: "skipped" });
  });
});
