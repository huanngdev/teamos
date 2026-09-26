import type { Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

interface SearchToolbarAction {
  icon: Icon;
  label: string;
  onClick: () => void;
}

interface SearchToolbarProps {
  action?: SearchToolbarAction;
  isSearching: boolean;
  name: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  search: string;
  searchLabel: string;
}

/*
 * Shared search toolbar: a bordered input with a leading search icon on the
 * left and an optional primary action on the right. Both the members and the
 * projects panels use it so their search affordance stays identical.
 */
function SearchToolbar({
  action,
  isSearching,
  name,
  onSearchChange,
  placeholder,
  search,
  searchLabel,
}: SearchToolbarProps) {
  const ActionIcon = action?.icon;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <InputGroup className="sm:max-w-xs">
        <InputGroupAddon>
          <MagnifyingGlassIcon aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          aria-label={searchLabel}
          autoComplete="off"
          name={name}
          onChange={(event) => {
            onSearchChange(event.target.value);
          }}
          placeholder={placeholder}
          type="search"
          value={search}
        />
        {isSearching ? (
          <InputGroupAddon align="inline-end">
            <span className="text-xs">Searching…</span>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {action === undefined || ActionIcon === undefined ? null : (
        <Button className="sm:ml-auto" onClick={action.onClick}>
          <ActionIcon data-icon="inline-start" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

export { SearchToolbar, type SearchToolbarAction };
