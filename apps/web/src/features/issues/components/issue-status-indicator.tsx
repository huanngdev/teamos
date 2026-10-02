import type { IssueStatusCategory, ProjectStatusSummary } from "@teamos/shared";

import { issueStatusCategoryAppearance } from "../lib/issue-status-appearance";
import { IssueFieldLabel } from "./issue-field-label";

function IssueStatusIndicator({
  category,
  name,
}: {
  category: IssueStatusCategory | null;
  name: string;
}) {
  if (category === null) {
    return <span className="min-w-0 truncate text-sm text-muted-foreground">{name}</span>;
  }

  const appearance = issueStatusCategoryAppearance[category];
  const StatusIcon = appearance.icon;

  return (
    <IssueFieldLabel>
      <StatusIcon aria-hidden="true" className={`size-4 shrink-0 ${appearance.className}`} />
      <span className="min-w-0 truncate group-hover/menu-item:text-foreground group-focus/menu-item:text-foreground group-data-[highlighted]/menu-item:text-foreground">
        {name}
      </span>
    </IssueFieldLabel>
  );
}

function IssueStatusOption({
  label,
  statusId,
  statuses,
}: {
  label: string;
  statusId: string;
  statuses: readonly ProjectStatusSummary[];
}) {
  const status = statuses.find((item) => item.id === statusId);

  if (status === undefined) {
    return label;
  }

  return <IssueStatusIndicator category={status.category} name={status.name} />;
}

export { IssueStatusIndicator, IssueStatusOption };
