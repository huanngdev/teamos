import type { EligibleAssignee, ProjectStatusSummary } from "@teamos/shared";
import { issuePriorities } from "@teamos/shared";
import { CaretDownIcon, FunnelIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IssuePriorityIcon } from "@/features/issues/components/issue-priority-icon";
import { issueStatusCategoryAppearance } from "@/features/issues/lib/issue-status-appearance";
import type { EligibleAssigneePicker } from "@/features/projects";
import { countAdvancedIssueViewFilters } from "../lib/issue-view-draft";
import type { IssueViewFilterOption } from "../hooks/use-issue-view-catalog";
import type { IssueViewFormState } from "../hooks/use-issue-view-form";
import { ViewAssigneePicker } from "./view-assignee-picker";

function FilterMenu({
  label,
  onClear,
  onToggle,
  options,
  renderOption,
  selected,
}: {
  label: string;
  onClear: () => void;
  onToggle: (id: string) => void;
  options: readonly IssueViewFilterOption[];
  renderOption?: (option: IssueViewFilterOption) => ReactNode;
  selected: readonly string[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline">
            <FunnelIcon data-icon="inline-start" />
            {selected.length > 0 ? `${label} (${selected.length})` : label}
          </Button>
        }
      />
      <DropdownMenuContent>
        <DropdownMenuGroup>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              checked={selected.includes(option.id)}
              key={option.id}
              onCheckedChange={() => {
                onToggle(option.id);
              }}
            >
              {renderOption === undefined ? option.label : renderOption(option)}
            </DropdownMenuCheckboxItem>
          ))}
          {selected.length === 0 ? null : (
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={onClear}>
              Clear {label.toLowerCase()}
            </DropdownMenuCheckboxItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IssueViewFilterFields({
  assignees,
  form,
  knownAssignees,
  options,
  statuses,
}: {
  assignees: EligibleAssigneePicker;
  form: IssueViewFormState;
  knownAssignees: readonly EligibleAssignee[];
  options: {
    categoryOptions: readonly IssueViewFilterOption[];
    priorityOptions: readonly IssueViewFilterOption[];
    statusOptions: readonly IssueViewFilterOption[];
  };
  statuses: readonly ProjectStatusSummary[];
}) {
  const advancedCount = countAdvancedIssueViewFilters(form.definition.filters);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <ViewAssigneePicker
          known={knownAssignees}
          onClear={form.onClearAssignees}
          onToggle={form.onToggleAssignee}
          picker={assignees}
          selected={form.selectedAssignees}
        />
        <FilterMenu
          label="Priority"
          onClear={form.onClearPriorities}
          onToggle={form.onTogglePriority}
          options={options.priorityOptions}
          renderOption={(option) => <PriorityChoice id={option.id} label={option.label} />}
          selected={form.selectedPriorities}
        />
        <FilterMenu
          label="Status"
          onClear={form.onClearStatuses}
          onToggle={form.onToggleStatus}
          options={options.statusOptions}
          renderOption={(option) => (
            <StatusChoice label={option.label} statusId={option.id} statuses={statuses} />
          )}
          selected={form.selectedStatuses}
        />
        <FilterMenu
          label="Category"
          onClear={form.onClearCategories}
          onToggle={form.onToggleCategory}
          options={options.categoryOptions}
          selected={form.selectedCategories}
        />
      </div>
      <Collapsible>
        <CollapsibleTrigger
          render={
            <Button type="button" variant="outline">
              <FunnelIcon data-icon="inline-start" />
              {advancedCount > 0 ? `More filters (${advancedCount})` : "More filters"}
              <CaretDownIcon data-icon="inline-end" />
            </Button>
          }
        />
        <CollapsibleContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="view-search-filter">Search</FieldLabel>
              <Input
                id="view-search-filter"
                onChange={(event) => {
                  form.onSetText("q", event.target.value);
                }}
                value={form.definition.filters.q ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="view-title-filter">Title</FieldLabel>
              <Input
                id="view-title-filter"
                onChange={(event) => {
                  form.onSetText("title", event.target.value);
                }}
                value={form.definition.filters.title ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="view-description-filter">Description</FieldLabel>
              <Input
                id="view-description-filter"
                onChange={(event) => {
                  form.onSetText("description", event.target.value);
                }}
                value={form.definition.filters.description ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="view-number-min">Number from</FieldLabel>
              <Input
                id="view-number-min"
                min={1}
                onChange={(event) => {
                  form.onSetNumber("min", event.target.value);
                }}
                type="number"
                value={form.definition.filters.numberMin ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="view-number-max">Number to</FieldLabel>
              <Input
                id="view-number-max"
                min={1}
                onChange={(event) => {
                  form.onSetNumber("max", event.target.value);
                }}
                type="number"
                value={form.definition.filters.numberMax ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="view-created-from">Created from</FieldLabel>
              <Input
                id="view-created-from"
                onChange={(event) => {
                  form.onSetDate("createdFrom", event.target.value);
                }}
                type="date"
                value={form.definition.filters.createdFrom ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="view-created-to">Created to</FieldLabel>
              <Input
                id="view-created-to"
                onChange={(event) => {
                  form.onSetDate("createdTo", event.target.value);
                }}
                type="date"
                value={form.definition.filters.createdTo ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="view-updated-from">Updated from</FieldLabel>
              <Input
                id="view-updated-from"
                onChange={(event) => {
                  form.onSetDate("updatedFrom", event.target.value);
                }}
                type="date"
                value={form.definition.filters.updatedFrom ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="view-updated-to">Updated to</FieldLabel>
              <Input
                id="view-updated-to"
                onChange={(event) => {
                  form.onSetDate("updatedTo", event.target.value);
                }}
                type="date"
                value={form.definition.filters.updatedTo ?? ""}
              />
            </Field>
          </FieldGroup>
          <Button onClick={form.onResetFilters} type="button" variant="ghost">
            Reset filters
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

function PriorityChoice({ id, label }: { id: string; label: string }) {
  const priority = issuePriorities.find((item) => item === id);

  if (priority === undefined) {
    return label;
  }

  return <IssuePriorityIcon priority={priority} />;
}

function StatusChoice({
  label,
  statusId,
  statuses,
}: {
  label: string;
  statusId: string;
  statuses: readonly ProjectStatusSummary[];
}) {
  const status = statuses.find((item) => item.id === statusId);

  if (status === undefined) {
    return label;
  }

  const appearance = issueStatusCategoryAppearance[status.category];
  const Icon = appearance.icon;

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon aria-hidden="true" className={`size-4 shrink-0 ${appearance.className}`} />
      <span className="truncate">{status.name}</span>
    </span>
  );
}

export { IssueViewFilterFields };
