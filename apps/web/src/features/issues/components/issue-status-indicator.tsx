import type { IssueStatusCategory } from "@teamos/shared";

import { issueStatusCategoryAppearance } from "../lib/issue-status-appearance";

function IssueStatusIndicator({
  category,
  name,
}: {
  category: IssueStatusCategory | null;
  name: string;
}) {
  if (category === null) {
    return <span className="text-muted-foreground">{name}</span>;
  }

  const appearance = issueStatusCategoryAppearance[category];
  const StatusIcon = appearance.icon;

  return (
    <span className={`flex min-w-0 items-center gap-1.5 ${appearance.className}`}>
      <StatusIcon className="size-4 shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  );
}

export { IssueStatusIndicator };
