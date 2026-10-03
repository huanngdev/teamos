import {
  formatIssueCode,
  parseIssueNumberBound,
  type EligibleAssignee,
  type ProjectStatusSummary,
} from "@teamos/shared";
import { CaretDownIcon, FunnelIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/shared";
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
          onChange={form.onSetAssignees}
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
          <div className="flex flex-col gap-4 pt-4">
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
                <FieldLabel htmlFor="view-content-filter">Content</FieldLabel>
                <Input
                  id="view-content-filter"
                  onChange={(event) => {
                    form.onSetText("content", event.target.value);
                  }}
                  value={form.definition.filters.content ?? ""}
                />
              </Field>
              <IssueViewNumberBound
                id="view-number-min"
                label="Number from"
                onCommit={(value) => {
                  form.onSetNumber("min", value);
                }}
                value={form.definition.filters.numberMin}
              />
              <IssueViewNumberBound
                id="view-number-max"
                label="Number to"
                onCommit={(value) => {
                  form.onSetNumber("max", value);
                }}
                value={form.definition.filters.numberMax}
              />
              <Field>
                <FieldLabel htmlFor="view-created-range">Created</FieldLabel>
                <DateRangePicker
                  from={form.definition.filters.createdFrom ?? ""}
                  id="view-created-range"
                  onChange={(from, to) => {
                    form.onSetDateRange("created", from, to);
                  }}
                  to={form.definition.filters.createdTo ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="view-updated-range">Updated</FieldLabel>
                <DateRangePicker
                  from={form.definition.filters.updatedFrom ?? ""}
                  id="view-updated-range"
                  onChange={(from, to) => {
                    form.onSetDateRange("updated", from, to);
                  }}
                  to={form.definition.filters.updatedTo ?? ""}
                />
              </Field>
            </FieldGroup>
            <Button onClick={form.onResetFilters} type="button" variant="ghost">
              Reset filters
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

function IssueViewNumberBound({
  id,
  label,
  onCommit,
  value,
}: {
  id: string;
  label: string;
  onCommit: (value: string) => void;
  value: string | undefined;
}) {
  const formatted = value === undefined ? "" : formatIssueCode(value);
  const [draft, setDraft] = useState(formatted);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDraft(formatted);
    }
  }, [formatted]);

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        inputMode="numeric"
        onBlur={() => {
          focused.current = false;
          const trimmed = draft.trim();

          if (trimmed.length === 0) {
            onCommit("");
            setDraft("");
            return;
          }

          const decimal = parseIssueNumberBound(trimmed);

          if (decimal === undefined) {
            setDraft(formatted);
            return;
          }

          onCommit(trimmed);
          setDraft(formatIssueCode(decimal));
        }}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onFocus={() => {
          focused.current = true;
        }}
        value={draft}
      />
    </Field>
  );
}

export { IssueViewFilterFields };
