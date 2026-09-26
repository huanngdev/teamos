/* eslint-disable shadcn/no-arbitrary-values -- viewport height is a fixed calc, not a theme token */
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useReducedMotion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useIssueBoardDrag } from "../hooks/use-issue-board-drag";
import type { IssueBoardState } from "../hooks/use-issue-board";
import { columnDragId } from "../query-keys";
import { ColumnFormDialog } from "./column-form-dialog";
import { DeleteColumnDialog } from "./delete-column-dialog";
import { IssueCardBody } from "./issue-card";
import { IssueColumn } from "./issue-column";
import { IssueFormDialog } from "./issue-form-dialog";
import { DotsSixVerticalIcon, PlusIcon, ArrowsClockwiseIcon } from "@phosphor-icons/react";

interface IssueBoardProps {
  state: IssueBoardState;
}

const boardCollision: CollisionDetection = (args) => {
  if (!String(args.active.id).startsWith("column:")) {
    return issueCollision(args);
  }

  const columns = args.droppableContainers.filter((container) => {
    const id = String(container.id);

    return id.startsWith("column:") && id !== String(args.active.id);
  });
  const scoped = { ...args, droppableContainers: columns };

  return pointerWithin(scoped);
};

const issueCollision: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  const issues = args.droppableContainers.filter((container) => {
    const id = String(container.id);

    return id.startsWith("issue:") && id !== activeId;
  });
  const issueHit = pointerWithin({ ...args, droppableContainers: issues });

  if (issueHit.length > 0) {
    return issueHit;
  }

  const columns = args.droppableContainers.filter((container) =>
    String(container.id).startsWith("column:"),
  );

  return pointerWithin({ ...args, droppableContainers: columns });
};

function IssueBoard({ state }: IssueBoardProps) {
  if (state.status === "loading") {
    return <IssueBoardLoading />;
  }

  if (state.status === "not-found") {
    return (
      <Alert>
        <AlertTitle>Project not found</AlertTitle>
        <AlertDescription>This project is not available in the workspace.</AlertDescription>
      </Alert>
    );
  }

  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Board unavailable</AlertTitle>
        <AlertDescription>
          <span className="block">{state.message}</span>
          <Button className="mt-2" onClick={state.retry} variant="outline">
            <ArrowsClockwiseIcon data-icon="inline-start" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <IssueBoardReady view={state.view} />;
}

function IssueBoardReady({
  view,
}: {
  view: Extract<IssueBoardState, { status: "ready" }>["view"];
}) {
  const reduceMotion = useReducedMotion();
  const drag = useIssueBoardDrag({
    columns: view.columns,
    members: view.members,
    onDrop: view.onDrop,
  });
  const sourceStatusId = drag.activeIssue?.statusId ?? null;
  const foreignGap =
    drag.issueDrop !== null && drag.issueDrop.statusId !== sourceStatusId ? drag.issueDrop : null;
  const board = (
    <div className="flex h-[calc(100vh-4rem)] w-max ">
      {view.columns.map((column) => (
        <IssueColumn
          canCreateIssue={view.canCreateIssue}
          canDragCards={view.canUpdateIssue}
          canUpdateProject={view.canUpdateProject}
          column={column}
          gapHeight={foreignGap?.statusId === column.status.id ? drag.activeHeight : null}
          gapIndex={foreignGap?.statusId === column.status.id ? foreignGap.index : null}
          key={column.status.id}
          members={view.members}
          onCreateIssue={() => {
            view.onCreateIssue(column.status.id);
          }}
          onDelete={() => {
            view.onDeleteColumn(column.status.id);
          }}
          onEditIssue={view.onEditIssue}
          onRename={() => {
            view.onRenameColumn(column.status.id);
          }}
        />
      ))}
      {view.canUpdateProject ? (
        <div className="flex shrink-0 items-start p-3">
          <Button onClick={view.onCreateColumn} variant="outline">
            <PlusIcon data-icon="inline-start" />
            Add column
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {view.truncated === null ? null : (
        <Alert>
          <AlertTitle>Board truncated</AlertTitle>
          <AlertDescription>
            Showing {view.truncated.shown} of {view.truncated.total} issues.
          </AlertDescription>
        </Alert>
      )}
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <DndContext
          collisionDetection={boardCollision}
          measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
          onDragCancel={drag.onDragCancel}
          onDragEnd={drag.onDragEnd}
          onDragMove={drag.onDragMove}
          onDragStart={drag.onDragStart}
          sensors={drag.sensors}
        >
          <SortableContext
            items={view.columns.map((column) => columnDragId(column.status.id))}
            strategy={horizontalListSortingStrategy}
          >
            {board}
          </SortableContext>
          <DragOverlay
            dropAnimation={
              reduceMotion ? null : { duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }
            }
          >
            {drag.activeIssue !== null ? (
              <div
                // The overlay must keep the card's measured width so it does not resize on drop.
                // eslint-disable-next-line shadcn/no-inline-styles
                style={drag.activeWidth === null ? undefined : { width: drag.activeWidth }}
              >
                <IssueCardBody issue={drag.activeIssue} member={drag.activeMember} />
              </div>
            ) : drag.activeColumn !== null ? (
              <div className="flex items-center gap-2 rounded-md bg-background px-3 py-2 text-sm shadow-md ring-1 ring-foreground/10">
                <DotsSixVerticalIcon />
                <span className="truncate">{drag.activeColumn.status.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </ScrollArea>
      <IssueFormDialog
        form={view.issueForm}
        members={view.members}
        membersError={view.membersError}
        statuses={view.columns.map((column) => column.status)}
      />
      <ColumnFormDialog form={view.columnForm} />
      <DeleteColumnDialog state={view.deleteColumn} />
    </div>
  );
}

function IssueBoardLoading() {
  return (
    <div aria-busy="true" className="flex h-full gap-4" role="status">
      <span className="sr-only">Loading board</span>
      <Skeleton className="h-80 w-72" />
      <Skeleton className="h-80 w-72" />
      <Skeleton className="h-80 w-72" />
    </div>
  );
}

export { IssueBoard };
