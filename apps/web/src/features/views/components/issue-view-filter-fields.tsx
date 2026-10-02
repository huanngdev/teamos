import type { EligibleAssignee, ProjectStatusSummary } from "@teamos/shared";
import { CaretDownIcon, FunnelIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IssueFieldMenu } from "@/features/issues/components/issue-field-menu";
import { IssuePriorityOption } from "@/features/issues/components/issue-priority-icon";
import { IssueStatusOption } from "@/features/issues/components/issue-status-indicator";
import type { EligibleAssigneePicker } from "@/features/projects";
import { countAdvancedIssueViewFilters } from "../lib/issue-view-draft";
import type { IssueViewFilterOption } from "../hooks/use-issue-view-catalog";
import type { IssueViewFormState } from "../hooks/use-issue-view-form";
import { ViewAssigneePicker } from "./view-assignee-picker";

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
        <IssueFieldMenu
          icon={<FunnelIcon data-icon="inline-start" />}
          label="Priority"
          mode="multiple"
          onClear={form.onClearPriorities}
          onSelect={form.onTogglePriority}
          options={options.priorityOptions}
          renderOption={(option) => <IssuePriorityOption id={option.id} label={option.label} />}
          selected={form.selectedPriorities}
        />
        <IssueFieldMenu
          icon={<FunnelIcon data-icon="inline-start" />}
          label="Status"
          mode="multiple"
          onClear={form.onClearStatuses}
          onSelect={form.onToggleStatus}
          options={options.statusOptions}
          renderOption={(option) => (
            <IssueStatusOption label={option.label} statusId={option.id} statuses={statuses} />
          )}
          selected={form.selectedStatuses}
        />
        <IssueFieldMenu
          icon={<FunnelIcon data-icon="inline-start" />}
          label="Category"
          mode="multiple"
          onClear={form.onClearCategories}
          onSelect={form.onToggleCategory}
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

export { IssueViewFilterFields };
