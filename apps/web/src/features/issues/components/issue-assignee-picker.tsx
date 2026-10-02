import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CheckIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { getInitials, type EligibleAssignee } from "@teamos/shared";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import type { EligibleAssigneePicker } from "@/features/projects";
import { useIssueAssigneeMenu } from "../hooks/use-issue-assignee-menu";
import { AssigneeFaces } from "./issue-assignee-faces";

function IssueAssigneePicker({
  appearance = "default",
  disabled,
  onSelect,
  picker,
  selected,
}: {
  appearance?: "default" | "property";
  disabled: boolean;
  onSelect: (assignees: EligibleAssignee[]) => void;
  picker: EligibleAssigneePicker;
  selected: readonly EligibleAssignee[];
}) {
  const menu = useIssueAssigneeMenu({ onSelect, picker, selected });

  return (
    <Popover onOpenChange={menu.onOpenChange} open={menu.open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={menu.label}
            disabled={disabled}
            size={appearance === "property" ? "sm" : "default"}
            type="button"
            variant={appearance === "property" ? "ghost" : "outline"}
          >
            <AssigneeFaces people={selected} />
          </Button>
        }
      />
      <PopoverContent align="start">
        <div onKeyDown={menu.onKeyDown}>
          <InputGroup>
            <InputGroupInput
              aria-label="Assign to"
              onChange={(event) => {
                picker.onSearch(event.target.value);
              }}
              placeholder="Assign to..."
              value={picker.search}
            />
            <InputGroupAddon align="inline-end">
              <Kbd aria-hidden="true">A</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <div
            aria-label="Assign to"
            aria-multiselectable="true"
            className="mt-2 flex flex-col"
            role="listbox"
          >
            <AssigneeOption checked={selected.length === 0} onSelect={menu.clear} shortcut="0">
              <UserCircleIcon data-icon="inline-start" />
              <span className="min-w-0 flex-1 truncate text-left">No assignee</span>
            </AssigneeOption>
            {picker.loading ? (
              <div aria-busy="true" className="flex items-center gap-2 px-2 py-1.5" role="status">
                <Spinner />
                <span>Loading assignees</span>
              </div>
            ) : null}
            {menu.visible.map((person, index) => (
              <AssigneeOption
                checked={menu.selectedIds.has(person.id)}
                key={person.id}
                onSelect={() => {
                  menu.toggle(person);
                }}
                shortcut={index < 9 ? String(index + 1) : undefined}
              >
                <Avatar aria-hidden="true" size="sm">
                  <AvatarImage alt="" src={person.image ?? undefined} />
                  <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-left">{person.name}</span>
              </AssigneeOption>
            ))}
            {picker.error === null ? null : (
              <div className="flex flex-col gap-2 px-2 py-1.5">
                <p className="text-destructive">{picker.error}</p>
                <Button onClick={picker.onRetry} type="button" variant="outline">
                  <ArrowsClockwiseIcon data-icon="inline-start" />
                  Retry
                </Button>
              </div>
            )}
            {!picker.loading && menu.visible.length === 0 && picker.error === null ? (
              <p className="px-2 py-1.5 text-muted-foreground">No assignees</p>
            ) : null}
            {picker.hasMore ? (
              <Button
                className="justify-start"
                disabled={picker.loadingMore}
                onClick={picker.onLoadMore}
                type="button"
                variant="ghost"
              >
                {picker.loadingMore ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <CaretDownIcon data-icon="inline-start" />
                )}
                Load more
              </Button>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AssigneeOption({
  checked,
  children,
  onSelect,
  shortcut,
}: {
  checked: boolean;
  children: ReactNode;
  onSelect: () => void;
  shortcut?: string;
}) {
  return (
    <Button
      aria-selected={checked}
      className="w-full justify-start"
      onClick={onSelect}
      role="option"
      type="button"
      variant="ghost"
    >
      {children}
      {checked ? <CheckIcon aria-hidden="true" data-icon="inline-end" /> : null}
      {shortcut === undefined ? null : <Kbd aria-hidden="true">{shortcut}</Kbd>}
    </Button>
  );
}

export { IssueAssigneePicker };
