import { getInitials, type IssueSummary, type ProjectMember } from "@teamos/shared";
import { UserCircleIcon } from "@phosphor-icons/react";

import { KanbanItem, KanbanItemHandle } from "@/components/reui/kanban";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { IssuePriorityIcon } from "./issue-priority-icon";

interface IssueCardProps {
  canDrag: boolean;
  issue: IssueSummary;
  member: ProjectMember | undefined;
  onEdit: () => void;
}

function IssueCard({ canDrag, issue, member, onEdit }: IssueCardProps) {
  const body = (
    <button
      aria-label={member === undefined ? issue.title : `${issue.title}, ${member.name}`}
      className="w-full text-left"
      onClick={onEdit}
      type="button"
    >
      <IssueCardBody issue={issue} member={member} />
    </button>
  );

  return (
    <KanbanItem
      className={canDrag ? undefined : "!opacity-100"}
      disabled={!canDrag}
      value={issue.id}
    >
      {canDrag ? <KanbanItemHandle>{body}</KanbanItemHandle> : body}
    </KanbanItem>
  );
}

function IssueAssignee({ member }: { member: ProjectMember | undefined }) {
  if (member === undefined) {
    return (
      <span aria-label="Unassigned" className="shrink-0 text-muted-foreground" role="img">
        <UserCircleIcon className="size-4" />
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-1">
      <Avatar className="size-4">
        <AvatarImage alt="" src={member.image ?? undefined} />
        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
      </Avatar>
      <span className="line-clamp-1 min-w-0 text-xs text-muted-foreground" title={member.name}>
        {member.name}
      </span>
    </span>
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
              <div className="shrink-0">
                <IssuePriorityIcon priority={issue.priority} />
              </div>
              <IssueAssignee member={member} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { IssueCard, IssueCardBody };
