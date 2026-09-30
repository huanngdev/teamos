import { PlusIcon, ArrowsClockwiseIcon } from "@phosphor-icons/react";

import { Kanban, KanbanBoard, KanbanOverlay } from "@/components/reui/kanban";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useIssueBoardDrag } from "../hooks/use-issue-board-drag";
import type { IssueBoardState } from "../hooks/use-issue-board";
import { ColumnFormDialog } from "./column-form-dialog";
import { DeleteColumnDialog } from "./delete-column-dialog";
import { IssueColumn } from "./issue-column";
import { IssueFormDialog } from "./issue-form-dialog";

interface IssueBoardProps {
  state: IssueBoardState;
}

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
  const drag = useIssueBoardDrag({
    columns: view.columns,
    onDrop: view.onDrop,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      {view.truncated === null ? null : (
        <Alert>
          <AlertTitle>Board truncated</AlertTitle>
          <AlertDescription>
            Showing {view.truncated.shown} of {view.truncated.total} issues.
          </AlertDescription>
        </Alert>
      )}
      <ScrollArea className="min-h-0 min-w-0 flex-1" fade="x">
        <Kanban
          className="h-full"
          getItemValue={drag.getItemValue}
          onDragCancel={drag.onDragCancel}
          onDragEnd={drag.onDragEnd}
          onValueChange={drag.onValueChange}
          onValueCommit={drag.onValueCommit}
          value={drag.value}
        >
          <KanbanBoard className="h-full">
            <div className="flex h-full w-max gap-2 p-2">
              {drag.columns.map((column) => (
                <IssueColumn
                  canCreateIssue={view.canCreateIssue}
                  canDragCards={view.canUpdateIssue}
                  canUpdateProject={view.canUpdateProject}
                  column={column}
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
          </KanbanBoard>
          <KanbanOverlay>
            {({ variant }) => (
              <div
                className={`size-full border-2 border-dashed bg-muted/10 ${variant === "column" ? "rounded-lg" : "rounded-xl"}`}
              />
            )}
          </KanbanOverlay>
        </Kanban>
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
