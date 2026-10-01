import type { EligibleAssignee } from "@teamos/shared";
import { UserCircleIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import type { EligibleAssigneePicker } from "@/features/projects";
import { PersonIdentity } from "@/shared";

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
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button aria-label="Assignee" disabled={disabled} type="button" variant="outline">
            {selected === null ? (
              <>
                <UserCircleIcon data-icon="inline-start" />
                Unassigned
              </>
            ) : (
              <PersonIdentity image={selected.image} name={selected.name} />
            )}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80">
        <Input
          aria-label="Search assignees"
          onChange={(event) => {
            picker.onSearch(event.target.value);
          }}
          placeholder="Search name or email"
          value={picker.search}
        />
        <AssigneeChoices onSelect={onSelect} picker={picker} selectedId={selected?.id ?? null} />
      </PopoverContent>
    </Popover>
  );
}

function AssigneeChoices({
  onSelect,
  picker,
  selectedId,
}: {
  onSelect: (assignee: EligibleAssignee | null) => void;
  picker: EligibleAssigneePicker;
  selectedId: string | null;
}) {
  return (
    <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
      <Button
        aria-pressed={selectedId === null}
        onClick={() => {
          onSelect(null);
        }}
        type="button"
        variant="ghost"
      >
        <UserCircleIcon data-icon="inline-start" />
        Unassigned
      </Button>
      {picker.loading ? (
        <div aria-busy="true" className="flex items-center gap-2 px-2 py-1.5" role="status">
          <Spinner />
          <span>Loading assignees</span>
        </div>
      ) : null}
      {picker.assignees.map((assignee) => (
        <Button
          aria-pressed={assignee.id === selectedId}
          key={assignee.id}
          onClick={() => {
            onSelect(assignee);
          }}
          type="button"
          variant="ghost"
        >
          <PersonIdentity email={assignee.email} image={assignee.image} name={assignee.name} />
        </Button>
      ))}
      {picker.error === null ? null : (
        <div className="flex flex-col gap-2 px-2 py-1.5">
          <p className="text-destructive">{picker.error}</p>
          <Button onClick={picker.onRetry} type="button" variant="outline">
            Retry
          </Button>
        </div>
      )}
      {picker.hasMore ? (
        <Button
          disabled={picker.loadingMore}
          onClick={picker.onLoadMore}
          type="button"
          variant="ghost"
        >
          {picker.loadingMore ? <Spinner data-icon="inline-start" /> : null}
          Load more
        </Button>
      ) : null}
    </div>
  );
}

export { AssigneeChoices, IssueAssigneePicker };
