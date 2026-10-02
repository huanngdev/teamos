import { unassignedAssigneeId, type EligibleAssignee } from "@teamos/shared";

import type { EligibleAssigneePicker } from "@/features/projects";
import { buildMemberChoices, unassignedMemberChoice } from "../lib/member-choices";
import { MemberSelect } from "./member-select";

function IssueAssigneePicker({
  disabled,
  onSelect,
  picker,
  selected,
}: {
  disabled: boolean;
  onSelect: (assignee: EligibleAssignee | null) => void;
  picker: EligibleAssigneePicker;
  selected: EligibleAssignee | null;
}) {
  const selectedIds = selected === null ? [unassignedAssigneeId] : [selected.id];
  const choices = buildMemberChoices({
    assignees: picker.assignees,
    includeCurrentUser: false,
    includeUnassigned: true,
    known: selected === null ? [] : [selected],
    selectedIds,
  });
  const value = choices.find((choice) => choice.id === selectedIds[0]) ?? unassignedMemberChoice;

  return (
    <MemberSelect
      choices={choices}
      disabled={disabled}
      error={picker.error}
      hasMore={picker.hasMore}
      loading={picker.loading}
      loadingMore={picker.loadingMore}
      mode="single"
      onLoadMore={picker.onLoadMore}
      onRetry={picker.onRetry}
      onSearch={picker.onSearch}
      onValueChange={(choice) => {
        if (choice === null || choice.id === unassignedAssigneeId) {
          onSelect(null);
          return;
        }

        const match =
          picker.assignees.find((assignee) => assignee.id === choice.id) ??
          (selected?.id === choice.id ? selected : null);

        if (match !== null) {
          onSelect(match);
        }
      }}
      value={value}
    />
  );
}

export { IssueAssigneePicker };
