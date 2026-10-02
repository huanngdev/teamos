import { ArrowsClockwiseIcon, CaretDownIcon } from "@phosphor-icons/react";
import type { KeyboardEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { EligibleAssigneePicker } from "@/features/projects";

interface AssigneeMenuRow {
  content: ReactNode;
  id: string;
  onSelect: () => void;
  pressed: boolean;
}

function IssueChoiceButton({
  children,
  disabled = false,
  onClick,
  pressed,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <Button
      aria-pressed={pressed}
      className="h-auto w-full justify-start"
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant="ghost"
    >
      {/* -mx-2.5 cancels the button's own horizontal padding so the inset is only p-2. */}
      <span className="-mx-2.5 flex w-full items-center gap-1.5 p-2">{children}</span>
    </Button>
  );
}

function AssigneeSearchField({
  onKeyDown,
  picker,
}: {
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  picker: EligibleAssigneePicker;
}) {
  return (
    <Input
      aria-label="Search assignees"
      onChange={(event) => {
        picker.onSearch(event.target.value);
      }}
      onKeyDown={onKeyDown}
      placeholder="Search name or email"
      value={picker.search}
    />
  );
}

function AssigneeMenuList({
  leading,
  people,
  picker,
  trailing = [],
}: {
  leading: readonly AssigneeMenuRow[];
  people: readonly AssigneeMenuRow[];
  picker: EligibleAssigneePicker;
  trailing?: readonly AssigneeMenuRow[];
}) {
  return (
    <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
      {leading.map((row) => (
        <AssigneeMenuRowButton key={row.id} row={row} />
      ))}
      {picker.loading ? (
        <div aria-busy="true" className="flex items-center gap-2 px-2 py-1.5" role="status">
          <Spinner />
          <span>Loading assignees</span>
        </div>
      ) : null}
      {people.map((row) => (
        <AssigneeMenuRowButton key={row.id} row={row} />
      ))}
      {trailing.map((row) => (
        <AssigneeMenuRowButton key={row.id} row={row} />
      ))}
      {picker.error === null ? null : (
        <div className="flex flex-col gap-2 px-2 py-1.5">
          <p className="text-left text-destructive">{picker.error}</p>
          <Button
            className="w-full justify-start"
            onClick={picker.onRetry}
            type="button"
            variant="outline"
          >
            <ArrowsClockwiseIcon data-icon="inline-start" />
            Retry
          </Button>
        </div>
      )}
      {picker.hasMore ? (
        <IssueChoiceButton disabled={picker.loadingMore} onClick={picker.onLoadMore}>
          {picker.loadingMore ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CaretDownIcon data-icon="inline-start" />
          )}
          Load more
        </IssueChoiceButton>
      ) : null}
    </div>
  );
}

function AssigneeMenuRowButton({ row }: { row: AssigneeMenuRow }) {
  return (
    <IssueChoiceButton onClick={row.onSelect} pressed={row.pressed}>
      {row.content}
    </IssueChoiceButton>
  );
}

export { AssigneeMenuList, AssigneeSearchField, IssueChoiceButton, type AssigneeMenuRow };
