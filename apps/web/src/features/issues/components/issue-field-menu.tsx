import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface IssueFieldOption {
  id: string;
  label: string;
}

function IssueFieldMenu({
  accessibleName,
  disabled = false,
  icon,
  label,
  mode,
  onClear,
  onSelect,
  options,
  renderOption,
  selected,
  size = "default",
  trigger,
  variant = "outline",
}: {
  accessibleName?: string;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  mode: "multiple" | "single";
  onClear?: () => void;
  onSelect: (id: string) => void;
  options: readonly IssueFieldOption[];
  renderOption?: (option: IssueFieldOption) => ReactNode;
  selected: readonly string[];
  size?: "default" | "sm";
  trigger?: ReactNode;
  variant?: "ghost" | "outline";
}) {
  const optionContent = (option: IssueFieldOption) =>
    renderOption === undefined ? option.label : renderOption(option);
  const countLabel = selected.length > 0 ? `${label} (${selected.length})` : label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={accessibleName}
            disabled={disabled}
            size={size}
            type="button"
            variant={variant}
          >
            {trigger ?? (
              <>
                {icon}
                {countLabel}
              </>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-fit">
        <DropdownMenuGroup>
          {mode === "single" ? (
            <DropdownMenuRadioGroup
              onValueChange={(next) => {
                if (typeof next === "string") {
                  onSelect(next);
                }
              }}
              value={selected[0]}
            >
              {options.map((option) => (
                <DropdownMenuRadioItem closeOnClick key={option.id} value={option.id}>
                  {optionContent(option)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          ) : (
            options.map((option) => (
              <DropdownMenuCheckboxItem
                checked={selected.includes(option.id)}
                key={option.id}
                onCheckedChange={() => {
                  onSelect(option.id);
                }}
              >
                {optionContent(option)}
              </DropdownMenuCheckboxItem>
            ))
          )}
          {mode === "multiple" && onClear !== undefined && selected.length > 0 ? (
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={onClear}>
              Clear {label.toLowerCase()}
            </DropdownMenuCheckboxItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { IssueFieldMenu, type IssueFieldOption };
