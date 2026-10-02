import type { EligibleAssignee } from "@teamos/shared";
import { UserCircleIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EligibleAssigneePicker } from "@/features/projects";
import { PersonIdentity } from "@/shared";
import { AssigneeMenuList, AssigneeSearchField, type AssigneeMenuRow } from "./assignee-menu";
import { IssueIconLabel } from "./issue-field-label";

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
  const people: AssigneeMenuRow[] = picker.assignees.map((assignee) => ({
    content: <PersonIdentity email={assignee.email} image={assignee.image} name={assignee.name} />,
    id: assignee.id,
    onSelect: () => {
      onSelect(assignee);
    },
    pressed: assignee.id === selected?.id,
  }));

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button aria-label="Assignee" disabled={disabled} type="button" variant="outline">
            {selected === null ? (
              <IssueIconLabel icon={UserCircleIcon} label="Unassigned" />
            ) : (
              <PersonIdentity image={selected.image} name={selected.name} />
            )}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80">
        <AssigneeSearchField picker={picker} />
        <AssigneeMenuList
          leading={[
            {
              content: <IssueIconLabel icon={UserCircleIcon} label="Unassigned" />,
              id: "unassigned",
              onSelect: () => {
                onSelect(null);
              },
              pressed: selected === null,
            },
          ]}
          people={people}
          picker={picker}
        />
      </PopoverContent>
    </Popover>
  );
}

export { IssueAssigneePicker };
