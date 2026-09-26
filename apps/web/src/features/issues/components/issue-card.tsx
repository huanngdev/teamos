import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getInitials, type IssueSummary, type ProjectMember } from "@teamos/shared";
import { UserCircleIcon } from "@phosphor-icons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { issueDragId } from "../query-keys";
import { IssuePriorityIcon } from "./issue-priority-icon";

interface IssueCardProps {
  canDrag: boolean;
  issue: IssueSummary;
  member: ProjectMember | undefined;
  onEdit: () => void;
  shiftY: number;
}

function IssueCard({ canDrag, issue, member, onEdit, shiftY }: IssueCardProps) {
  const sortable = useSortable({ disabled: !canDrag, id: issueDragId(issue.id) });
  const y = sortable.isDragging ? 0 : (sortable.transform?.y ?? 0) + shiftY;
  const style = {
    // The list does not reorder during drag; only the visual offset moves.
    // eslint-disable-next-line shadcn/no-inline-styles
    transform: CSS.Translate.toString({ scaleX: 1, scaleY: 1, x: 0, y }),
    // eslint-disable-next-line shadcn/no-inline-styles
    transition: sortable.isDragging
      ? undefined
      : (sortable.transition ?? "transform 180ms cubic-bezier(0.2, 0, 0, 1)"),
  };

  return (
    <div
      className={sortable.isDragging ? "invisible" : "motion-reduce:transition-none"}
      ref={sortable.setNodeRef}
      style={style}
    >
      <button
        aria-label={issue.title}
        className="w-full text-left"
        onClick={onEdit}
        type="button"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <IssueCardBody issue={issue} member={member} />
      </button>
    </div>
  );
}

function IssueAssignee({ member }: { member: ProjectMember | undefined }) {
  if (member === undefined) {
    return (
      <span aria-label="Unassigned" className="text-muted-foreground" role="img">
        <UserCircleIcon className="size-4" />
      </span>
    );
  }

  return (
    <Avatar className="size-4">
      <AvatarImage alt="" src={member.image ?? undefined} />
      <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
    </Avatar>
  );
}

function IssueCardBody({
  issue,
  member,
}: {
  issue: IssueSummary;
  member: ProjectMember | undefined;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Card size="sm">
        <CardContent>
          <div className="flex flex-col gap-2">
            <span className="line-clamp-2 font-medium">{issue.title}</span>
            <div className="flex items-center justify-between gap-2">
              <IssuePriorityIcon priority={issue.priority} />
              <IssueAssignee member={member} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { IssueCard, IssueCardBody };
