import { getIssuePriorityLabel, type IssuePriority } from "@teamos/shared";
import {
  CellSignalFullIcon,
  CellSignalHighIcon,
  CellSignalLowIcon,
  CellSignalMediumIcon,
  CellSignalNoneIcon,
  type Icon,
} from "@phosphor-icons/react";

const priorityIcons: Record<IssuePriority, { className: string; icon: Icon }> = {
  high: { className: "text-orange-500", icon: CellSignalHighIcon },
  low: { className: "text-sky-600", icon: CellSignalLowIcon },
  medium: { className: "text-amber-500", icon: CellSignalMediumIcon },
  none: { className: "text-muted-foreground", icon: CellSignalNoneIcon },
  urgent: { className: "text-red-600", icon: CellSignalFullIcon },
};

function IssuePriorityIcon({ priority }: { priority: IssuePriority }) {
  const item = priorityIcons[priority];
  const ValueIcon = item.icon;

  return (
    <span className="flex items-center gap-1">
      <span className="relative size-4">
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
      <span className={`text-xs ${item.className}`}>{getIssuePriorityLabel(priority)}</span>
    </span>
  );
}

export { IssuePriorityIcon };
