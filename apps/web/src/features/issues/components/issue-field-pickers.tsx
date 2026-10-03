import {
  getIssuePriorityLabel,
  issuePriorities,
  type IssuePriority,
  type ProjectStatusSummary,
} from "@teamos/shared";

import { IssueFieldMenu } from "./issue-field-menu";
import { IssuePriorityIcon, IssuePriorityOption } from "./issue-priority-icon";
import { IssueStatusIndicator, IssueStatusOption } from "./issue-status-indicator";

function IssueStatusPicker({
  appearance = "default",
  disabled,
  onChange,
  statuses,
  value,
}: {
  appearance?: "default" | "property";
  disabled: boolean;
  onChange: (statusId: string) => void;
  statuses: readonly ProjectStatusSummary[];
  value: string;
}) {
  const selected = statuses.find((status) => status.id === value) ?? statuses[0];

  return (
    <IssueFieldMenu
      accessibleName="Status"
      disabled={disabled}
      label="Status"
      mode="single"
      onSelect={onChange}
      options={statuses.map((status) => ({ id: status.id, label: status.name }))}
      renderOption={(option) => (
        <IssueStatusOption label={option.label} statusId={option.id} statuses={statuses} />
      )}
      selected={value.length === 0 ? [] : [value]}
      size={appearance === "property" ? "sm" : "default"}
      variant={appearance === "property" ? "ghost" : "outline"}
      trigger={
        selected === undefined ? (
          "Status"
        ) : (
          <IssueStatusIndicator category={selected.category} name={selected.name} />
        )
      }
    />
  );
}

function IssuePriorityPicker({
  appearance = "default",
  disabled,
  onChange,
  value,
}: {
  appearance?: "default" | "property";
  disabled: boolean;
  onChange: (priority: IssuePriority) => void;
  value: IssuePriority;
}) {
  return (
    <IssueFieldMenu
      accessibleName="Priority"
      disabled={disabled}
      label="Priority"
      mode="single"
      onSelect={(id) => {
        const priority = issuePriorities.find((item) => item === id);

        if (priority !== undefined) {
          onChange(priority);
        }
      }}
      options={issuePriorities.map((priority) => ({
        id: priority,
        label: getIssuePriorityLabel(priority),
      }))}
      renderOption={(option) => <IssuePriorityOption id={option.id} label={option.label} />}
      selected={[value]}
      size={appearance === "property" ? "sm" : "default"}
      variant={appearance === "property" ? "ghost" : "outline"}
      trigger={<IssuePriorityIcon priority={value} />}
    />
  );
}

export { IssuePriorityPicker, IssueStatusPicker };
