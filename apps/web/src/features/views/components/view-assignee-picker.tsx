import type { EligibleAssignee } from "@teamos/shared";
import { UserCircleIcon, UsersIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
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
        <Input
          aria-label="Search assignees"
          onChange={(event) => {
            picker.onSearch(event.target.value);
          }}
          placeholder="Search name or email"
          value={picker.search}
        />
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          <AssigneeToken
            pressed={selected.includes("me")}
            onToggle={() => {
              onToggle("me");
            }}
            title="Me"
          />
          <AssigneeToken
            pressed={selected.includes("unassigned")}
            onToggle={() => {
              onToggle("unassigned");
            }}
            title="Unassigned"
          />
          {picker.loading ? (
            <div aria-busy="true" className="flex items-center gap-2 px-2 py-1.5" role="status">
              <Spinner />
              <span>Loading assignees</span>
            </div>
          ) : null}
          {picker.assignees.map((assignee) => (
            <Button
              aria-pressed={selected.includes(assignee.id)}
              key={assignee.id}
              onClick={() => {
                onToggle(assignee.id);
              }}
              type="button"
              variant="ghost"
            >
              <PersonIdentity email={assignee.email} image={assignee.image} name={assignee.name} />
            </Button>
          ))}
          {selected
            .filter(
              (token) =>
                token !== "me" &&
                token !== "unassigned" &&
                !picker.assignees.some((assignee) => assignee.id === token),
            )
            .map((token) => {
              const assignee = knownById.get(token);

              return (
                <Button
                  aria-pressed={true}
                  key={token}
                  onClick={() => {
                    onToggle(token);
                  }}
                  type="button"
                  variant="ghost"
                >
                  {assignee === undefined ? (
                    "Saved assignee"
                  ) : (
                    <PersonIdentity
                      email={assignee.email}
                      image={assignee.image}
                      name={assignee.name}
                    />
                  )}
                </Button>
              );
            })}
          {picker.error === null ? null : (
            <Button onClick={picker.onRetry} type="button" variant="outline">
              Retry
            </Button>
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
        {selected.length === 0 ? null : (
          <Button onClick={onClear} type="button" variant="ghost">
            Clear assignees
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AssigneeToken({
  onToggle,
  pressed,
  title,
}: {
  onToggle: () => void;
  pressed: boolean;
  title: string;
}) {
  return (
    <Button aria-pressed={pressed} onClick={onToggle} type="button" variant="ghost">
      <UserCircleIcon data-icon="inline-start" />
      {title}
    </Button>
  );
}

export { ViewAssigneePicker };
