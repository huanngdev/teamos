import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useRef, useState } from "react";
import type { IssueSummary, ProjectMember } from "@teamos/shared";

import {
  columnDropSlot,
  issueDropSlot,
  type BoardColumn,
  type IssueDropTarget,
} from "../lib/board-columns";
import { parseDragId } from "../query-keys";

interface IssueBoardDragState {
  activeColumn: BoardColumn | null;
  activeHeight: number | null;
  activeIssue: IssueSummary | null;
  activeMember: ProjectMember | undefined;
  activeWidth: number | null;
  issueDrop: IssueDropTarget | null;
  onDragCancel: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragMove: (event: DragMoveEvent) => void;
  onDragStart: (event: DragStartEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}

function useIssueBoardDrag(options: {
  columns: readonly BoardColumn[];
  members: readonly ProjectMember[];
  onDrop: (
    activeId: string,
    overId: string,
    issueSlot: IssueDropTarget | null,
    columnIndex: number | null,
  ) => void;
}): IssueBoardDragState {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeHeight, setActiveHeight] = useState<number | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | null>(null);
  const [issueDrop, setIssueDrop] = useState<IssueDropTarget | null>(null);
  const columnDropRef = useRef<number | null>(null);
  const issueDropRef = useRef<IssueDropTarget | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const activeIssue =
    options.columns
      .flatMap((column) => column.issues)
      .find((issue) => `issue:${issue.id}` === activeId) ?? null;
  const activeColumn =
    options.columns.find((column) => `column:${column.status.id}` === activeId) ?? null;

  function rememberDrop(event: DragOverEvent | DragMoveEvent) {
    if (event.over === null) {
      return;
    }

    const active = parseDragId(String(event.active.id));
    const over = parseDragId(String(event.over.id));

    if (active === null || over === null || active.id === over.id) {
      return;
    }

    if (active.kind === "issue") {
      const slot = issueDropSlot(
        options.columns,
        active.id,
        over.id,
        pointerPastMiddle(event, event.over.rect, "y"),
      );

      if (slot === null || sameSlot(issueDropRef.current, slot)) {
        return;
      }

      issueDropRef.current = slot;
      setIssueDrop(slot);
      return;
    }

    const index = columnDropSlot(
      options.columns,
      active.id,
      over.id,
      pointerPastMiddle(event, event.over.rect, "x"),
    );

    if (index === null || columnDropRef.current === index) {
      return;
    }

    columnDropRef.current = index;
  }

  function clearDrag() {
    columnDropRef.current = null;
    issueDropRef.current = null;
    setActiveHeight(null);
    setActiveId(null);
    setActiveWidth(null);
    setIssueDrop(null);
  }

  return {
    activeColumn,
    activeHeight,
    activeIssue,
    activeMember: options.members.find(
      (member) => member.memberId === activeIssue?.assigneeMemberId,
    ),
    activeWidth,
    issueDrop,
    onDragCancel: clearDrag,
    onDragEnd: (event) => {
      const issueSlot = issueDropRef.current;
      const columnIndex = columnDropRef.current;
      clearDrag();

      if (event.over === null) {
        return;
      }

      options.onDrop(String(event.active.id), String(event.over.id), issueSlot, columnIndex);
    },
    onDragMove: rememberDrop,
    onDragStart: (event) => {
      setActiveHeight(event.active.rect.current.initial?.height ?? null);
      setActiveId(String(event.active.id));
      setActiveWidth(event.active.rect.current.initial?.width ?? null);
    },
    sensors,
  };
}

function sameSlot(left: IssueDropTarget | null, right: IssueDropTarget) {
  return left?.statusId === right.statusId && left.index === right.index;
}

function pointerPastMiddle(
  event: DragMoveEvent,
  rect: { height: number; left: number; top: number; width: number } | null,
  axis: "x" | "y",
): boolean {
  if (rect === null || !(event.activatorEvent instanceof PointerEvent)) {
    return false;
  }

  if (axis === "x") {
    return event.activatorEvent.clientX + event.delta.x > rect.left + rect.width / 2;
  }

  return event.activatorEvent.clientY + event.delta.y > rect.top + rect.height / 2;
}

export { useIssueBoardDrag };
