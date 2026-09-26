import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
import { columnDragId, issueDragId } from "../query-keys";
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
  gapHeight: number | null;
  gapIndex: number | null;
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
  gapHeight,
  gapIndex,
  members,
  onCreateIssue,
  onDelete,
  onEditIssue,
  onRename,
}: IssueColumnProps) {
  const sortable = useSortable({
    disabled: { draggable: !canUpdateProject, droppable: !canDragCards && !canUpdateProject },
    id: columnDragId(column.status.id),
  });
  const categoryIcon = categoryIcons[column.status.category];
  const CategoryIcon = categoryIcon.icon;
  const style = {
    // dnd-kit shifts the other columns while this one is dragged.
    // eslint-disable-next-line shadcn/no-inline-styles
    transform: CSS.Transform.toString(sortable.transform),
    // eslint-disable-next-line shadcn/no-inline-styles
    transition: sortable.transition,
  };

  return (
    <div
      className={`relative flex h-full w-72 shrink-0 flex-col border-r ${sortable.isDragging ? "opacity-40" : ""}`}
      ref={sortable.setNodeRef}
      style={style}
    >
      <div className="flex shrink-0 items-center gap-2 px-3 py-2">
        {canUpdateProject ? (
          <Button
            aria-label={`Reorder ${column.status.name}`}
            size="icon"
            variant="ghost"
            {...sortable.attributes}
            {...sortable.listeners}
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
      <ScrollArea className="min-h-0 flex-1">
        <SortableContext
          items={column.issues.map((issue) => issueDragId(issue.id))}
          strategy={verticalListSortingStrategy}
        >
          <div className="relative flex flex-col gap-2 px-3 pb-3">
            {column.issues.length === 0 ? (
              gapIndex === 0 && gapHeight !== null ? (
                <DropGap height={gapHeight} />
              ) : (
                <p className="text-sm text-muted-foreground">No issues</p>
              )
            ) : (
              column.issues.map((issue, index) => (
                <IssueCard
                  canDrag={canDragCards}
                  issue={issue}
                  key={issue.id}
                  member={members.find((member) => member.memberId === issue.assigneeMemberId)}
                  onEdit={() => {
                    onEditIssue(issue.id);
                  }}
                  shiftY={
                    gapHeight !== null && gapIndex !== null && index >= gapIndex ? gapHeight : 0
                  }
                />
              ))
            )}
            {gapIndex === column.issues.length && column.issues.length > 0 && gapHeight !== null ? (
              <DropGap height={gapHeight} />
            ) : null}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

function DropGap({ height }: { height: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none"
      // The gap matches the dragged card so the cards below slide down together.
      // eslint-disable-next-line shadcn/no-inline-styles
      style={{ height }}
    />
  );
}

export { IssueColumn };
