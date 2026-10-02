import type { IssueCardSummary } from "@teamos/shared";
import { act, renderHook } from "@testing-library/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { describe, expect, test, vi } from "vitest";

import type { KanbanCommitMeta } from "@/components/reui/kanban";
import type { BoardColumn } from "@/features/issues";
import { useIssueViewDrag } from "./use-issue-view-drag";

function card(id: string, statusId: string): IssueCardSummary {
  return {
    assignee: null,
    assigneeMemberId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    id,
    number: 1,
    position: 0,
    priority: "none",
    statusId,
    title: id,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function column(statusId: string, issues: IssueCardSummary[]): BoardColumn {
  return {
    error: null,
    hasMoreAfter: false,
    hasMoreBefore: false,
    issues,
    loadingMore: false,
    prependToken: 0,
    prepended: 0,
    skippedBefore: 0,
    status: {
      category: "unstarted",
      id: statusId,
      isDefault: false,
      name: statusId,
      position: 0,
    },
    total: issues.length,
    trimToken: 0,
    trimmed: 0,
  };
}

function commit(
  kind: "item" | "column",
  activeId: string,
  overContainer: string,
  overIndex: number,
): KanbanCommitMeta<IssueCardSummary> {
  return {
    activeContainer: "backlog",
    activeIndex: 0,
    event: { active: { id: activeId } } as DragEndEvent,
    kind,
    overContainer,
    overIndex,
    previousValue: {},
  };
}

describe("useIssueViewDrag", () => {
  test("keeps the dropped index for another column and for the same column", () => {
    const onMoveIssue = vi.fn();
    const columns = [
      column("backlog", [card("moving", "backlog"), card("stay", "backlog")]),
      column("todo", [card("a", "todo"), card("b", "todo")]),
    ];
    const { result } = renderHook(() => useIssueViewDrag({ columns, onMoveIssue }));

    act(() => {
      result.current.onValueCommit({}, commit("item", "moving", "todo", 2));
      result.current.onValueCommit({}, commit("item", "stay", "backlog", 1));
    });

    expect(onMoveIssue).toHaveBeenNthCalledWith(1, "moving", "todo", 2);
    expect(onMoveIssue).toHaveBeenNthCalledWith(2, "stay", "backlog", 1);
  });

  test("does not move a workflow column", () => {
    const onMoveIssue = vi.fn();
    const { result } = renderHook(() =>
      useIssueViewDrag({
        columns: [column("backlog", [card("moving", "backlog")])],
        onMoveIssue,
      }),
    );

    act(() => {
      result.current.onValueCommit({}, commit("column", "backlog", "todo", 1));
    });

    expect(onMoveIssue).not.toHaveBeenCalled();
  });
});
