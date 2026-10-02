import { useState } from "react";
import type { IssueCardSummary } from "@teamos/shared";

import type { KanbanCommitMeta } from "@/components/reui/kanban";
import type { BoardColumn } from "@/features/issues";

type BoardValue = Record<string, IssueCardSummary[]>;

function boardValue(columns: readonly BoardColumn[]): BoardValue {
  return Object.fromEntries(columns.map((column) => [column.status.id, [...column.issues]]));
}

function columnsFromValue(source: readonly BoardColumn[], value: BoardValue): BoardColumn[] {
  return Object.entries(value).flatMap(([statusId, issues]) => {
    const column = source.find((item) => item.status.id === statusId);

    return column === undefined ? [] : [{ ...column, issues }];
  });
}

function useIssueViewDrag(options: {
  columns: readonly BoardColumn[];
  onMoveIssue: (issueId: string, statusId: string, index: number) => void;
}) {
  const [preview, setPreview] = useState<BoardValue | null>(null);
  const value = preview ?? boardValue(options.columns);

  function clearPreview() {
    queueMicrotask(() => {
      setPreview(null);
    });
  }

  function onValueCommit(_next: BoardValue, meta: KanbanCommitMeta<IssueCardSummary>) {
    if (meta.kind !== "item") {
      return;
    }

    const issueId = String(meta.event.active.id);
    const issue = options.columns
      .flatMap((column) => column.issues)
      .find((item) => item.id === issueId);

    if (issue === undefined) {
      return;
    }

    options.onMoveIssue(issueId, meta.overContainer, meta.overIndex);
  }

  return {
    columns: columnsFromValue(options.columns, value),
    getItemValue: (issue: IssueCardSummary) => issue.id,
    onDragCancel: clearPreview,
    onDragEnd: clearPreview,
    onValueChange: setPreview,
    onValueCommit,
    value,
  };
}

export { useIssueViewDrag };
