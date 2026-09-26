import { useSortable } from "@dnd-kit/react/sortable";
import { getInitials, type IssueSummary, type ProjectMember } from "@teamos/shared";
import { UserCircleIcon } from "@phosphor-icons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { issueDragId } from "../query-keys";
import { IssuePriorityIcon } from "./issue-priority-icon";

interface IssueCardProps {
  canDrag: boolean;
  issue: IssueSummary;
  index: number;
  member: ProjectMember | undefined;
  onEdit: () => void;
  statusId: string;
}

function IssueCard({ canDrag, issue, index, member, onEdit, statusId }: IssueCardProps) {
  const sortable = useSortable({
    accept: "issue",
    disabled: !canDrag,
    group: statusId,
    id: issueDragId(issue.id),
    index,
    type: "issue",
  });

  return (
    <div className="relative" ref={sortable.ref}>
      <button
        aria-label={issue.title}
        className="w-full text-left"
        onClick={onEdit}
        ref={sortable.handleRef}
        type="button"
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
      <Card>
        <CardContent>
          <div className="flex flex-col gap-2">
            <span className="line-clamp-2 h-10 font-medium leading-5">{issue.title}</span>
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
