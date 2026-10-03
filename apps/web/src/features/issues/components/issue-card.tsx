import { formatIssueCode, type IssueCardSummary } from "@teamos/shared";

import { KanbanItem, KanbanItemHandle } from "@/components/reui/kanban";
import { Card, CardContent } from "@/components/ui/card";
import { AssigneeFaces } from "./issue-assignee-faces";
import { CreatedIssueHighlight } from "./created-issue-highlight";
import { IssuePriorityIcon } from "./issue-priority-icon";

interface IssueCardProps {
  canDrag: boolean;
  highlighted?: boolean;
  issue: IssueCardSummary;
  onEdit: () => void;
}

function IssueCard({ canDrag, highlighted = false, issue, onEdit }: IssueCardProps) {
  const names = issue.assignees.map((person) => person.name);
  const code = formatIssueCode(issue.number);
  const body = (
    <div className="relative" data-issue-id={issue.id}>
      <CreatedIssueHighlight active={highlighted} />
      <div className="flex items-start gap-1">
        <button
          aria-label={
            names.length === 0
              ? `${code}, ${issue.title}`
              : `${code}, ${issue.title}, ${names.join(", ")}`
          }
          className="min-w-0 flex-1 text-left"
          data-issue-path={code}
          onClick={onEdit}
          type="button"
        >
          <IssueCardBody issue={issue} />
        </button>
      </div>
    </div>
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

function IssueCardBody({ issue }: { issue: IssueCardSummary }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Card>
        <CardContent>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {formatIssueCode(issue.number)}
            </span>
            <span className="line-clamp-2 h-10 font-medium leading-5">{issue.title}</span>
            <div className="flex items-center justify-between gap-2">
              <div className="shrink-0">
                <IssuePriorityIcon priority={issue.priority} />
              </div>
              <AssigneeFaces density="card" emptyLabel="Unassigned" people={issue.assignees} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { IssueCard, IssueCardBody };
