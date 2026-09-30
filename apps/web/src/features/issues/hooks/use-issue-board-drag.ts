import { useState } from "react";
import type { IssueSummary } from "@teamos/shared";

import type { KanbanCommitMeta } from "@/components/reui/kanban";
import type { BoardColumn, IssueDropTarget } from "../lib/board-columns";
import { columnDragId, issueDragId } from "../query-keys";

type BoardValue = Record<string, IssueSummary[]>;

function getIssueItemId(issue: IssueSummary): string {
  return issue.id;
}

function boardValue(columns: readonly BoardColumn[]): BoardValue {
  return Object.fromEntries(columns.map((column) => [column.status.id, [...column.issues]]));
}

function columnsFromValue(source: readonly BoardColumn[], value: BoardValue): BoardColumn[] {
  const statuses = new Map(source.map((column) => [column.status.id, column.status]));

  return Object.entries(value).flatMap(([statusId, issues]) => {
    const status = statuses.get(statusId);

    return status === undefined ? [] : [{ issues, status }];
  });
}

function useIssueBoardDrag(options: {
  columns: readonly BoardColumn[];
  onDrop: (activeId: string, issueSlot: IssueDropTarget | null, columnIndex: number | null) => void;
}) {
  const [preview, setPreview] = useState<BoardValue | null>(null);
  const value = preview ?? boardValue(options.columns);

  function clearPreview() {
    /*
     * The kanban calls onValueChange again after drag end while it commits a
     * column reorder. Clear on the next turn so that write cannot stick.
     */
    queueMicrotask(() => {
      setPreview(null);
    });
  }

  function onValueChange(next: BoardValue) {
    setPreview(next);
  }

  function onValueCommit(_next: BoardValue, meta: KanbanCommitMeta<IssueSummary>) {
    if (meta.kind === "item") {
      options.onDrop(
        issueDragId(String(meta.event.active.id)),
        { index: meta.overIndex, statusId: meta.overContainer },
        null,
      );
      return;
    }

    options.onDrop(columnDragId(meta.activeContainer), null, meta.overIndex);
  }

  return {
    columns: columnsFromValue(options.columns, value),
    getItemValue: getIssueItemId,
    onDragCancel: clearPreview,
    onDragEnd: clearPreview,
    onValueChange,
    onValueCommit,
    value,
  };
}

export { useIssueBoardDrag };
