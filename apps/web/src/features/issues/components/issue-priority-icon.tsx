import { getIssuePriorityLabel, issuePriorities, type IssuePriority } from "@teamos/shared";
import {
  CellSignalFullIcon,
  CellSignalHighIcon,
  CellSignalLowIcon,
  CellSignalMediumIcon,
  CellSignalNoneIcon,
  type Icon,
} from "@phosphor-icons/react";

import { IssueFieldLabel } from "./issue-field-label";

const priorityIcons: Record<IssuePriority, { className: string; icon: Icon }> = {
  high: { className: "text-orange-500", icon: CellSignalHighIcon },
  low: { className: "text-sky-600", icon: CellSignalLowIcon },
  medium: { className: "text-amber-500", icon: CellSignalMediumIcon },
  none: { className: "text-muted-foreground", icon: CellSignalNoneIcon },
  urgent: { className: "text-red-600", icon: CellSignalFullIcon },
};

const menuLabelClassName =
  "group-hover/menu-item:text-foreground group-focus/menu-item:text-foreground group-data-[highlighted]/menu-item:text-foreground";

function IssuePriorityIcon({ priority }: { priority: IssuePriority }) {
  const item = priorityIcons[priority];
  const ValueIcon = item.icon;

  return (
    <IssueFieldLabel>
      <span className="relative size-4 shrink-0">
        <CellSignalFullIcon
          aria-hidden="true"
          className="size-4 text-muted-foreground/30"
          weight="bold"
        />
        <ValueIcon
          aria-hidden="true"
          className={`absolute inset-0 size-4 ${item.className}`}
          weight="bold"
        />
      </span>
      <span className={`min-w-0 truncate ${item.className} ${menuLabelClassName}`}>
        {getIssuePriorityLabel(priority)}
      </span>
    </IssueFieldLabel>
  );
}

function IssuePriorityOption({ id, label }: { id: string; label: string }) {
  const priority = issuePriorities.find((item) => item === id);

  if (priority === undefined) {
    return label;
  }

  return <IssuePriorityIcon priority={priority} />;
}

export { IssuePriorityIcon, IssuePriorityOption };
