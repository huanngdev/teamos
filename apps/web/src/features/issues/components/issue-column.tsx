/* eslint-disable shadcn/no-arbitrary-values -- the issue viewport fills the column below its fixed 3rem header */
import { CollisionPriority } from "@dnd-kit/abstract";
import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
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
import { columnDragId } from "../query-keys";
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
  columnIndex: number;
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
  columnIndex,
  members,
  onCreateIssue,
  onDelete,
  onEditIssue,
  onRename,
}: IssueColumnProps) {
  const sortable = useSortable({
    accept: "column",
    disabled: !canUpdateProject,
    id: columnDragId(column.status.id),
    index: columnIndex,
    type: "column",
  });
  const droppable = useDroppable({
    accept: "issue",
    collisionPriority: CollisionPriority.Low,
    disabled: !canDragCards,
    id: column.status.id,
  });
  const categoryIcon = categoryIcons[column.status.category];
  const CategoryIcon = categoryIcon.icon;

  return (
    <div
      className={`relative flex h-full w-72 shrink-0 flex-col rounded-lg border bg-background ${sortable.isDragging ? "shadow-lg" : ""}`}
      ref={sortable.ref}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 px-3 py-2">
        {canUpdateProject ? (
          <Button
            aria-label={`Reorder ${column.status.name}`}
            size="icon"
            variant="ghost"
            ref={sortable.handleRef}
          >
            <DotsSixVerticalIcon />
          </Button>
        ) : null}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <CategoryIcon className={`size-3.5 shrink-0 ${categoryIcon.className}`} />
          <span className="truncate text-sm font-normal">{column.status.name}</span>
          <span className="text-xs text-muted-foreground">{column.issues.length}</span>
        </div>
        <div className="flex items-center gap-0">
          {canCreateIssue ? (
            <Button
              aria-label={`Add issue to ${column.status.name}`}
              onClick={onCreateIssue}
              size="icon"
              variant="ghost"
            >
              <PlusIcon />
            </Button>
          ) : null}
          {canUpdateProject ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button aria-label={`${column.status.name} actions`} size="icon" variant="ghost">
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
      <ScrollArea className="h-[calc(100%-3rem)] w-full" ref={droppable.ref}>
        <div className="relative flex flex-col gap-2 px-3 pb-3">
          {column.issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issues</p>
          ) : (
            column.issues.map((issue, index) => (
              <IssueCard
                canDrag={canDragCards}
                issue={issue}
                index={index}
                key={issue.id}
                member={members.find((member) => member.memberId === issue.assigneeMemberId)}
                onEdit={() => {
                  onEditIssue(issue.id);
                }}
                statusId={column.status.id}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export { IssueColumn };
