import type { IssueStatusCategory } from "@teamos/shared";
import {
  CheckCircleIcon,
  CircleDashedIcon,
  CircleIcon,
  RadioButtonIcon,
  XCircleIcon,
  type Icon,
} from "@phosphor-icons/react";

const issueStatusCategoryAppearance: Record<
  IssueStatusCategory,
  { className: string; icon: Icon }
> = {
  backlog: { className: "text-muted-foreground", icon: CircleDashedIcon },
  canceled: { className: "text-red-600", icon: XCircleIcon },
  completed: { className: "text-green-600", icon: CheckCircleIcon },
  started: { className: "text-amber-500", icon: RadioButtonIcon },
  unstarted: { className: "text-sky-600", icon: CircleIcon },
};

export { issueStatusCategoryAppearance };
