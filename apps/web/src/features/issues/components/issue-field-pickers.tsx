import type { IssuePriority, ProjectStatusSummary } from "@teamos/shared";
import { issuePriorities } from "@teamos/shared";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { issueStatusCategoryAppearance } from "../lib/issue-status-appearance";
import { IssuePriorityIcon } from "./issue-priority-icon";

function IssueStatusPicker({
  disabled,
  onChange,
  statuses,
  value,
}: {
  disabled: boolean;
  onChange: (statusId: string) => void;
  statuses: readonly ProjectStatusSummary[];
  value: string;
}) {
  const selected = statuses.find((status) => status.id === value) ?? statuses[0];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button aria-label="Status" disabled={disabled} type="button" variant="outline">
            {selected === undefined ? "Status" : <StatusOption status={selected} />}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-64">
        <div className="flex flex-col gap-1">
          {statuses.map((status) => (
            <Button
              aria-pressed={status.id === value}
              key={status.id}
              onClick={() => {
                onChange(status.id);
              }}
              type="button"
              variant="ghost"
            >
              <StatusOption status={status} />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function IssuePriorityPicker({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (priority: IssuePriority) => void;
  value: IssuePriority;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button aria-label="Priority" disabled={disabled} type="button" variant="outline">
            <IssuePriorityIcon priority={value} />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-56">
        <div className="flex flex-col gap-1">
          {issuePriorities.map((priority) => (
            <Button
              aria-pressed={priority === value}
              key={priority}
              onClick={() => {
                onChange(priority);
              }}
              type="button"
              variant="ghost"
            >
              <IssuePriorityIcon priority={priority} />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StatusOption({ status }: { status: ProjectStatusSummary }) {
  const appearance = issueStatusCategoryAppearance[status.category];
  const Icon = appearance.icon;

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon aria-hidden="true" className={`size-4 shrink-0 ${appearance.className}`} />
      <span className="truncate">{status.name}</span>
    </span>
  );
}

export { IssuePriorityPicker, IssueStatusPicker };
