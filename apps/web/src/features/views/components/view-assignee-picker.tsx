import type { EligibleAssignee } from "@teamos/shared";

import type { EligibleAssigneePicker } from "@/features/projects";
import { buildMemberChoices, selectedMemberChoices } from "@/features/issues/lib/member-choices";
import { MemberSelect } from "@/features/issues/components/member-select";

function ViewAssigneePicker({
  known,
  onChange,
  picker,
  selected,
}: {
  known: readonly EligibleAssignee[];
  onChange: (tokens: readonly string[]) => void;
  picker: EligibleAssigneePicker;
  selected: readonly string[];
}) {
  const choices = buildMemberChoices({
    assignees: picker.assignees,
    includeCurrentUser: true,
    includeUnassigned: true,
    known,
    selectedIds: selected,
  });

  return (
    <MemberSelect
      choices={choices}
      error={picker.error}
      hasMore={picker.hasMore}
      loading={picker.loading}
      loadingMore={picker.loadingMore}
      mode="multiple"
      onLoadMore={picker.onLoadMore}
      onRetry={picker.onRetry}
      onSearch={picker.onSearch}
      onValueChange={(next) => {
        onChange(next.map((choice) => choice.id));
      }}
      value={selectedMemberChoices(selected, choices)}
    />
  );
}

export { ViewAssigneePicker };
