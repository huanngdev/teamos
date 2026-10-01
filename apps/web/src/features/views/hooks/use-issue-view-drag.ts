import { useState } from "react";
import type { IssueCardSummary } from "@teamos/shared";

import type { KanbanCommitMeta } from "@/components/reui/kanban";
import type { BoardColumn } from "@/features/issues";
import { issueViewStatusMoveRequest } from "../lib/issue-view-move";

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
  onMoveColumn: (statusId: string, index: number) => void;
  onMoveStatus: (issueId: string, statusId: string) => void;
}) {
  const [preview, setPreview] = useState<BoardValue | null>(null);
  const value = preview ?? boardValue(options.columns);

  function clearPreview() {
    queueMicrotask(() => {
      setPreview(null);
    });
  }

  function onValueCommit(_next: BoardValue, meta: KanbanCommitMeta<IssueCardSummary>) {
    if (meta.kind === "column") {
      options.onMoveColumn(meta.activeContainer, meta.overIndex);
      return;
    }

    if (meta.kind !== "item") {
      return;
    }

    const issueId = String(meta.event.active.id);
    const issue = options.columns
      .flatMap((column) => column.issues)
      .find((item) => item.id === issueId);
    const request =
      issue === undefined ? null : issueViewStatusMoveRequest(issue.statusId, meta.overContainer);

    if (request !== null) {
      options.onMoveStatus(issueId, request.statusId);
    }
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
