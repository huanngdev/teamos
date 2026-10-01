import { getInitials, type IssueCardSummary, type ProjectMember } from "@teamos/shared";
import { UserCircleIcon } from "@phosphor-icons/react";

import { KanbanItem, KanbanItemHandle } from "@/components/reui/kanban";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { IssuePriorityIcon } from "./issue-priority-icon";

interface IssueCardProps {
  canDrag: boolean;
  issue: IssueCardSummary;
  member: ProjectMember | undefined;
  onEdit: () => void;
}

function IssueCard({ canDrag, issue, member, onEdit }: IssueCardProps) {
  const assigneeName = issue.assignee?.name ?? member?.name;
  const body = (
    <button
      aria-label={assigneeName === undefined ? issue.title : `${issue.title}, ${assigneeName}`}
      className="w-full text-left"
      onClick={onEdit}
      type="button"
    >
      <IssueCardBody
        assigneeName={assigneeName}
        image={issue.assignee?.image ?? member?.image}
        issue={issue}
      />
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

function IssueAssignee({
  image,
  name,
}: {
  image: string | null | undefined;
  name: string | undefined;
}) {
  if (name === undefined) {
    return (
      <span aria-label="Unassigned" className="shrink-0 text-muted-foreground" role="img">
        <UserCircleIcon className="size-4" />
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-1">
      <Avatar className="size-4">
        <AvatarImage alt="" src={image ?? undefined} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="line-clamp-1 min-w-0 text-xs text-muted-foreground" title={name}>
        {name}
      </span>
    </span>
  );
}

function IssueCardBody({
  assigneeName,
  image,
  issue,
}: {
  assigneeName: string | undefined;
  image: string | null | undefined;
  issue: IssueCardSummary;
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
              <IssueAssignee image={image} name={assigneeName} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { IssueCard, IssueCardBody };
