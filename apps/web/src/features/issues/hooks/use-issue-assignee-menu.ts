import { ISSUE_ASSIGNEE_MAX, type EligibleAssignee } from "@teamos/shared";
import { useState, type KeyboardEvent } from "react";

import type { EligibleAssigneePicker } from "@/features/projects";

function useIssueAssigneeMenu({
  onSelect,
  picker,
  selected,
}: {
  onSelect: (assignees: EligibleAssignee[]) => void;
  picker: EligibleAssigneePicker;
  selected: readonly EligibleAssignee[];
}) {
  const [open, setOpen] = useState(false);
  const selectedIds = new Set(selected.map((person) => person.id));
  const visible = [
    ...selected.filter((person) => !picker.assignees.some((item) => item.id === person.id)),
    ...picker.assignees,
  ];
  const label =
    selected.length === 0
      ? "Assignee, No assignee"
      : `Assignee, ${selected.map((person) => person.name).join(", ")}`;

  function toggle(person: EligibleAssignee) {
    if (selectedIds.has(person.id)) {
      onSelect(selected.filter((item) => item.id !== person.id));
      return;
    }

    if (selected.length >= ISSUE_ASSIGNEE_MAX) {
      return;
    }

    onSelect([...selected, person]);
  }

  function clear() {
    onSelect([]);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);

    if (!next) {
      picker.onSearch("");
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      return;
    }

    if (event.target instanceof HTMLInputElement && event.target.value.length > 0) {
      return;
    }

    if (event.key === "0") {
      event.preventDefault();
      clear();
      return;
    }

    if (!/^[1-9]$/.test(event.key)) {
      return;
    }

    const person = visible[Number(event.key) - 1];

    if (person === undefined) {
      return;
    }

    event.preventDefault();
    toggle(person);
  }

  return {
    clear,
    label,
    onKeyDown,
    onOpenChange,
    open,
    selectedIds,
    toggle,
    visible,
  };
}

export { useIssueAssigneeMenu };
