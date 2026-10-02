import type { EligibleAssignee } from "@teamos/shared";
import { UserCircleIcon, UsersIcon, XIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AssigneeMenuList,
  AssigneeSearchField,
  IssueChoiceButton,
  type AssigneeMenuRow,
} from "@/features/issues/components/assignee-menu";
import { IssueIconLabel } from "@/features/issues/components/issue-field-label";
import type { EligibleAssigneePicker } from "@/features/projects";
import { PersonIdentity } from "@/shared";

function ViewAssigneePicker({
  known,
  onClear,
  onToggle,
  picker,
  selected,
}: {
  known: readonly EligibleAssignee[];
  onClear: () => void;
  onToggle: (token: string) => void;
  picker: EligibleAssigneePicker;
  selected: readonly string[];
}) {
  const knownById = new Map<string, EligibleAssignee>();

  for (const assignee of [...known, ...picker.assignees]) {
    knownById.set(assignee.id, assignee);
  }

  const label = selected.length > 0 ? `Assignee (${selected.length})` : "Assignee";
  const people: AssigneeMenuRow[] = picker.assignees.map((assignee) => ({
    content: <PersonIdentity email={assignee.email} image={assignee.image} name={assignee.name} />,
    id: assignee.id,
    onSelect: () => {
      onToggle(assignee.id);
    },
    pressed: selected.includes(assignee.id),
  }));
  const trailing: AssigneeMenuRow[] = selected
    .filter(
      (token) =>
        token !== "me" &&
        token !== "unassigned" &&
        !picker.assignees.some((assignee) => assignee.id === token),
    )
    .map((token) => {
      const assignee = knownById.get(token);

      return {
        content:
          assignee === undefined ? (
            "Saved assignee"
          ) : (
            <PersonIdentity email={assignee.email} image={assignee.image} name={assignee.name} />
          ),
        id: token,
        onSelect: () => {
          onToggle(token);
        },
        pressed: true,
      };
    });

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline">
            <UsersIcon data-icon="inline-start" />
            {label}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80">
        <AssigneeSearchField picker={picker} />
        <AssigneeMenuList
          leading={[
            {
              content: <IssueIconLabel icon={UserCircleIcon} label="Me" />,
              id: "me",
              onSelect: () => {
                onToggle("me");
              },
              pressed: selected.includes("me"),
            },
            {
              content: <IssueIconLabel icon={UserCircleIcon} label="Unassigned" />,
              id: "unassigned",
              onSelect: () => {
                onToggle("unassigned");
              },
              pressed: selected.includes("unassigned"),
            },
          ]}
          people={people}
          picker={picker}
          trailing={trailing}
        />
        {selected.length === 0 ? null : (
          <IssueChoiceButton onClick={onClear}>
            <XIcon data-icon="inline-start" />
            Clear assignees
          </IssueChoiceButton>
        )}
      </PopoverContent>
    </Popover>
  );
}

export { ViewAssigneePicker };
