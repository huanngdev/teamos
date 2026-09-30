/* eslint-disable shadcn/no-arbitrary-values -- the issue viewport fills the column below its fixed 3rem header */
import type { IssueStatusCategory, ProjectMember } from "@teamos/shared";
import {
  CheckCircleIcon,
  CircleDashedIcon,
  CircleIcon,
  DotsSixVerticalIcon,
  DotsThreeIcon,
  PencilIcon,
  PlusIcon,
  RadioButtonIcon,
  TrashIcon,
  XCircleIcon,
  type Icon,
} from "@phosphor-icons/react";

import { KanbanColumn, KanbanColumnContent, KanbanColumnHandle } from "@/components/reui/kanban";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BoardColumn } from "../lib/board-columns";
import { IssueCard } from "./issue-card";

const categoryIcons: Record<IssueStatusCategory, { className: string; icon: Icon }> = {
  backlog: { className: "text-muted-foreground", icon: CircleDashedIcon },
  canceled: { className: "text-red-600", icon: XCircleIcon },
  completed: { className: "text-green-600", icon: CheckCircleIcon },
  started: { className: "text-amber-500", icon: RadioButtonIcon },
  unstarted: { className: "text-sky-600", icon: CircleIcon },
};

interface IssueColumnProps {
  canCreateIssue: boolean;
  canDragCards: boolean;
  canUpdateProject: boolean;
  column: BoardColumn;
  members: readonly ProjectMember[];
  onCreateIssue: () => void;
  onDelete: () => void;
  onEditIssue: (issueId: string) => void;
  onRename: () => void;
}

function IssueColumn({
  canCreateIssue,
  canDragCards,
  canUpdateProject,
  column,
  members,
  onCreateIssue,
  onDelete,
  onEditIssue,
  onRename,
}: IssueColumnProps) {
  const categoryIcon = categoryIcons[column.status.category];
  const CategoryIcon = categoryIcon.icon;

  return (
    <KanbanColumn
      className={canUpdateProject ? "h-full w-72 shrink-0" : "h-full w-72 shrink-0 !opacity-100"}
      disabled={!canUpdateProject}
      value={column.status.id}
    >
      <div className="relative flex h-full flex-col rounded-lg border bg-background">
        <div className="flex h-12 shrink-0 items-center gap-2 px-3 py-2">
          {canUpdateProject ? (
            <KanbanColumnHandle
              className="opacity-100"
              render={(props) => (
                <Button
                  {...props}
                  aria-label={`Reorder ${column.status.name}`}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <DotsSixVerticalIcon />
                </Button>
              )}
            />
          ) : null}
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <CategoryIcon className={`size-3.5 shrink-0 ${categoryIcon.className}`} />
            <span className="truncate text-sm font-normal">{column.status.name}</span>
            <span className="text-xs text-muted-foreground">{column.issues.length}</span>
          </div>
          <div className="flex items-center">
            {canCreateIssue ? (
              <Button
                aria-label={`Add issue to ${column.status.name}`}
                onClick={onCreateIssue}
                size="icon"
                type="button"
                variant="ghost"
              >
                <PlusIcon />
              </Button>
            ) : null}
            {canUpdateProject ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      aria-label={`${column.status.name} actions`}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <DotsThreeIcon />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={onRename}>
                      <PencilIcon data-icon="inline-start" />
                      Rename
                    </DropdownMenuItem>
                    {column.status.isDefault ? null : (
                      <DropdownMenuItem onClick={onDelete} variant="destructive">
                        <TrashIcon data-icon="inline-start" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        <ScrollArea className="h-[calc(100%-3rem)] w-full" fade="y">
          <KanbanColumnContent className="flex flex-col gap-2 px-3 pb-3" value={column.status.id}>
            {column.issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues</p>
            ) : (
              column.issues.map((issue) => (
                <IssueCard
                  canDrag={canDragCards}
                  issue={issue}
                  key={issue.id}
                  member={members.find((member) => member.memberId === issue.assigneeMemberId)}
                  onEdit={() => {
                    onEditIssue(issue.id);
                  }}
                />
              ))
            )}
          </KanbanColumnContent>
        </ScrollArea>
      </div>
    </KanbanColumn>
  );
}

export { IssueColumn };
