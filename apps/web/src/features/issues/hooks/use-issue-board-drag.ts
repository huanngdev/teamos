import { move } from "@dnd-kit/helpers";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/react";
import { useRef, useState } from "react";
import type { IssueSummary } from "@teamos/shared";

import type { BoardColumn, IssueDropTarget } from "../lib/board-columns";
import { columnDragId, issueDragId, parseDragId } from "../query-keys";

type IssueOrder = Record<string, string[]>;

function issueOrderFor(columns: readonly BoardColumn[]): IssueOrder {
  return Object.fromEntries(
    columns.map((column) => [
      column.status.id,
      column.issues.map((issue) => issueDragId(issue.id)),
    ]),
  );
}

function useIssueBoardDrag(options: {
  columns: readonly BoardColumn[];
  onDrop: (activeId: string, issueSlot: IssueDropTarget | null, columnIndex: number | null) => void;
}) {
  const [previewOrder, setPreviewOrder] = useState<IssueOrder | null>(null);
  const orderRef = useRef<IssueOrder | null>(null);
  const activeColumnIndex = useRef<number | null>(null);
  const sourceIssues = new Map<string, IssueSummary>(
    options.columns.flatMap((column) =>
      column.issues.map((issue) => [issueDragId(issue.id), issue] as const),
    ),
  );
  const issueOrder = previewOrder ?? issueOrderFor(options.columns);
  const columns = options.columns.map((column) => ({
    ...column,
    issues: (issueOrder[column.status.id] ?? [])
      .map((id) => sourceIssues.get(id))
      .filter((issue): issue is IssueSummary => issue !== undefined),
  }));

  function clearDrag() {
    orderRef.current = null;
    activeColumnIndex.current = null;
    setPreviewOrder(null);
  }

  function onDragStart(event: DragStartEvent) {
    const active = parseDragId(String(event.operation.source?.id));

    if (active?.kind === "issue") {
      orderRef.current = issueOrderFor(options.columns);
    } else if (active?.kind === "column") {
      activeColumnIndex.current = options.columns.findIndex(
        (column) => column.status.id === active.id,
      );
    }
  }

  function onDragOver(event: DragOverEvent) {
    const active = parseDragId(String(event.operation.source?.id));

    if (active?.kind === "issue") {
      const next = move(orderRef.current ?? issueOrderFor(options.columns), event);
      orderRef.current = next;
      setPreviewOrder(next);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const active = parseDragId(String(event.operation.source?.id));
    const currentOrder = orderRef.current ?? issueOrderFor(options.columns);
    const initialColumnIndex = activeColumnIndex.current;
    clearDrag();

    if (event.canceled || active === null || event.operation.target === null) {
      return;
    }

    if (active.kind === "issue") {
      const next = move(currentOrder, event);
      const id = issueDragId(active.id);
      const target = Object.entries(next).find(([, ids]) => ids.includes(id));

      if (target !== undefined) {
        options.onDrop(id, { statusId: target[0], index: target[1].indexOf(id) }, null);
      }
      return;
    }

    const id = columnDragId(active.id);
    const next = move(
      options.columns.map((column) => columnDragId(column.status.id)),
      event,
    );
    const index = next.indexOf(id);

    if (index >= 0 && index !== initialColumnIndex) {
      options.onDrop(id, null, index);
    }
  }

  return { columns, onDragEnd, onDragOver, onDragStart };
}

export { useIssueBoardDrag };
