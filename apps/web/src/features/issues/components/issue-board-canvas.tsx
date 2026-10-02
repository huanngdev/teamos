import type { IssueCardSummary, ProjectMember } from "@teamos/shared";
import { PlusIcon } from "@phosphor-icons/react";

import {
  Kanban,
  KanbanBoard,
  KanbanOverlay,
  type KanbanCommitMeta,
} from "@/components/reui/kanban";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { BoardColumn } from "../lib/board-columns";
import { IssueColumn } from "./issue-column";

interface IssueBoardDragState {
  columns: readonly BoardColumn[];
  getItemValue: (issue: IssueCardSummary) => string;
  onDragCancel: () => void;
  onDragEnd: () => void;
  onValueChange: (value: Record<string, IssueCardSummary[]>) => void;
  onValueCommit: (
    value: Record<string, IssueCardSummary[]>,
    meta: KanbanCommitMeta<IssueCardSummary>,
  ) => void;
  value: Record<string, IssueCardSummary[]>;
}

interface IssueBoardCanvasProps {
  canCreateIssue: boolean;
  canUpdateIssue: boolean;
  canUpdateProject: boolean;
  drag: IssueBoardDragState;
  members: readonly ProjectMember[];
  onCreateColumn: () => void;
  onCreateIssue: (statusId: string) => void;
  onDeleteColumn: (statusId: string) => void;
  onEditIssue: (issueId: string) => void;
  onLoadMore: (statusId: string) => void;
  onLoadPrevious: (statusId: string) => void;
  onRenameColumn: (statusId: string) => void;
  truncated: { shown: number; total: number } | null;
}

function IssueBoardCanvas({
  canCreateIssue,
  canUpdateIssue,
  canUpdateProject,
  drag,
  members,
  onCreateColumn,
  onCreateIssue,
  onDeleteColumn,
  onEditIssue,
  onLoadMore,
  onLoadPrevious,
  onRenameColumn,
  truncated,
}: IssueBoardCanvasProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {truncated === null ? null : (
        <Alert>
          <AlertTitle>Board truncated</AlertTitle>
          <AlertDescription>
            Showing {truncated.shown} of {truncated.total} issues.
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
                  canCreateIssue={canCreateIssue}
                  canDragCards={canUpdateIssue}
                  canUpdateProject={canUpdateProject}
                  column={column}
                  key={column.status.id}
                  members={members}
                  onCreateIssue={() => {
                    onCreateIssue(column.status.id);
                  }}
                  onDelete={() => {
                    onDeleteColumn(column.status.id);
                  }}
                  onEditIssue={onEditIssue}
                  onLoadMore={() => {
                    onLoadMore(column.status.id);
                  }}
                  onLoadPrevious={() => {
                    onLoadPrevious(column.status.id);
                  }}
                  onRename={() => {
                    onRenameColumn(column.status.id);
                  }}
                />
              ))}
              {canUpdateProject ? (
                <div className="flex shrink-0 items-start p-3">
                  <Button onClick={onCreateColumn} variant="outline">
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

export { IssueBoardCanvas, IssueBoardLoading, type IssueBoardDragState };
