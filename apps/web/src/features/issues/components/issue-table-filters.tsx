import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import {
  getIssuePriorityLabel,
  getIssueStatusCategoryLabel,
  issuePriorities,
  issueStatusCategories,
  unassignedAssigneeId,
  type EligibleAssignee,
} from "@teamos/shared";

import { DropdownMenuCheckboxItem, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DateRangeCalendar } from "@/shared";
import { useIssueTableContext } from "../lib/issue-table-context";
import { buildMemberChoices, selectedMemberChoices } from "../lib/member-choices";
import { issueTableColumnLabels, type IssueTableRow } from "../lib/issue-table-query";
import { MemberSelect } from "./member-select";
import { IssuePriorityOption } from "./issue-priority-icon";
import { IssueStatusIndicator, IssueStatusOption } from "./issue-status-indicator";

interface FilterColumn {
  getFilterValue: () => unknown;
  id: string;
  setFilterValue: (value: unknown) => void;
}

interface FilterOption {
  count: number;
  id: string;
  label: string;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function readBound(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function IssueColumnFilter({ column }: { column: FilterColumn }) {
  const options = useFilterOptions(column.id);

  if (column.id === "assignee") {
    return <AssigneeValueFilter column={column} />;
  }

  if (options !== null) {
    return <MultiValueFilter column={column} options={options} />;
  }

  if (column.id === "number") {
    return <NumberRangeFilter column={column} />;
  }

  if (column.id === "createdAt" || column.id === "updatedAt") {
    return <DateRangeFilter column={column} />;
  }

  return <TextFilter column={column} />;
}

function AssigneeValueFilter({ column }: { column: FilterColumn }) {
  const { assignees, members, rows } = useIssueTableContext();
  const { onSearch } = assignees;
  const selected = readStringList(column.getFilterValue());
  const choices = buildMemberChoices({
    assignees: assignees.assignees,
    includeCurrentUser: true,
    includeUnassigned: true,
    known: knownTableAssignees(members, rows),
    selectedIds: selected,
  });

  useEffect(() => {
    return () => {
      onSearch("");
    };
  }, [onSearch]);

  return (
    <MemberSelect
      choices={choices}
      error={assignees.error}
      hasMore={assignees.hasMore}
      inline
      loading={assignees.loading}
      loadingMore={assignees.loadingMore}
      mode="multiple"
      onLoadMore={assignees.onLoadMore}
      onRetry={assignees.onRetry}
      onSearch={assignees.onSearch}
      onValueChange={(next) => {
        const ids = next.map((choice) => choice.id);

        column.setFilterValue(ids.length > 0 ? ids : undefined);
      }}
      value={selectedMemberChoices(selected, choices)}
    />
  );
}

function knownTableAssignees(
  members: ReturnType<typeof useIssueTableContext>["members"],
  rows: readonly IssueTableRow[],
): EligibleAssignee[] {
  const known = new Map<string, EligibleAssignee>();

  for (const member of members) {
    known.set(member.memberId, {
      email: member.email,
      id: member.memberId,
      image: member.image,
      name: member.name,
    });
  }

  for (const row of rows) {
    if (row.assigneeId !== unassignedAssigneeId) {
      known.set(row.assigneeId, {
        email: row.assigneeEmail,
        id: row.assigneeId,
        image: row.assigneeImage,
        name: row.assigneeName,
      });
    }
  }

  return [...known.values()];
}

function MultiValueFilter({
  column,
  options,
}: {
  column: FilterColumn;
  options: readonly FilterOption[];
}) {
  const { statuses } = useIssueTableContext();
  const selected = readStringList(column.getFilterValue());

  if (options.length === 0) {
    return <p className="px-2 py-1.5 text-muted-foreground">No values</p>;
  }

  return (
    <DropdownMenuGroup>
      <div className="max-h-56 overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            checked={selected.includes(option.id)}
            key={option.id}
            onCheckedChange={(checked) => {
              const next =
                checked === true
                  ? [...selected, option.id]
                  : selected.filter((item) => item !== option.id);

              column.setFilterValue(next.length > 0 ? next : undefined);
            }}
          >
            <span className="min-w-0 flex-1">
              <FilterOptionLabel columnId={column.id} option={option} statuses={statuses} />
            </span>
            <span className="text-muted-foreground tabular-nums group-hover/menu-item:text-foreground group-focus/menu-item:text-foreground group-data-[highlighted]/menu-item:text-foreground">
              {option.count}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </div>
    </DropdownMenuGroup>
  );
}

function FilterOptionLabel({
  columnId,
  option,
  statuses,
}: {
  columnId: string;
  option: FilterOption;
  statuses: IssueTableContextStatuses;
}) {
  if (columnId === "priority") {
    return <IssuePriorityOption id={option.id} label={option.label} />;
  }

  if (columnId === "status") {
    return <IssueStatusOption label={option.label} statusId={option.id} statuses={statuses} />;
  }

  if (columnId === "category") {
    const category = issueStatusCategories.find((item) => item === option.id);

    if (category !== undefined) {
      return <IssueStatusIndicator category={category} name={option.label} />;
    }
  }

  return <span className="block truncate">{option.label}</span>;
}

function TextFilter({ column }: { column: FilterColumn }) {
  const value = column.getFilterValue();
  const applied = typeof value === "string" ? value : "";
  const [draft, setDraft] = useDebouncedCommit(applied, (next) => {
    column.setFilterValue(next.length > 0 ? next : undefined);
  });

  return (
    <div className="p-1">
      <Input
        aria-label={`Filter ${filterLabel(column.id)}`}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={stopMenuKeys}
        placeholder="Contains..."
        value={draft}
      />
    </div>
  );
}

function NumberRangeFilter({ column }: { column: FilterColumn }) {
  const value = column.getFilterValue();
  const appliedMin = Array.isArray(value) ? readBound(value[0]) : "";
  const appliedMax = Array.isArray(value) ? readBound(value[1]) : "";
  const maxRef = useRef(appliedMax);
  const minRef = useRef(appliedMin);
  const [min, setMin] = useDebouncedCommit(appliedMin, (next) => {
    writeNumberRange(column, next, maxRef.current);
  });
  const [max, setMax] = useDebouncedCommit(appliedMax, (next) => {
    writeNumberRange(column, minRef.current, next);
  });
  minRef.current = min;
  maxRef.current = max;

  return (
    <div className="flex items-center gap-2 p-1">
      <Input
        aria-label="Minimum number"
        min={1}
        onChange={(event) => {
          setMin(event.target.value);
        }}
        onKeyDown={stopMenuKeys}
        placeholder="Min"
        type="number"
        value={min}
      />
      <span className="text-muted-foreground">to</span>
      <Input
        aria-label="Maximum number"
        min={1}
        onChange={(event) => {
          setMax(event.target.value);
        }}
        onKeyDown={stopMenuKeys}
        placeholder="Max"
        type="number"
        value={max}
      />
    </div>
  );
}

function DateRangeFilter({ column }: { column: FilterColumn }) {
  const value = column.getFilterValue();
  const from = Array.isArray(value) && typeof value[0] === "string" ? value[0] : "";
  const to = Array.isArray(value) && typeof value[1] === "string" ? value[1] : "";

  const update = (nextFrom: string, nextTo: string) => {
    column.setFilterValue(
      nextFrom.length === 0 && nextTo.length === 0
        ? undefined
        : [nextFrom.length === 0 ? undefined : nextFrom, nextTo.length === 0 ? undefined : nextTo],
    );
  };

  return (
    <div className="w-fit">
      <DateRangeCalendar
        from={from}
        onChange={(nextFrom, nextTo) => {
          update(nextFrom, nextTo);
        }}
        to={to}
      />
    </div>
  );
}

function useFilterOptions(columnId: string): FilterOption[] | null {
  const { facets, rows, statuses } = useIssueTableContext();

  if (!isMultiColumn(columnId) || columnId === "assignee") {
    return null;
  }

  if (columnId === "status") {
    return statusOptions(rows, statuses, facets?.status);
  }

  if (columnId === "priority") {
    return issuePriorities.map((priority) => ({
      count: facetCount(facets?.priority, priority),
      id: priority,
      label: getIssuePriorityLabel(priority),
    }));
  }

  return issueStatusCategories.map((category) => ({
    count: facetCount(facets?.category, category),
    id: category,
    label: getIssueStatusCategoryLabel(category),
  }));
}

function facetCount(facets: Record<string, number> | undefined, id: string): number {
  return facets?.[id] ?? 0;
}

function isMultiColumn(
  columnId: string,
): columnId is "assignee" | "category" | "priority" | "status" {
  return (
    columnId === "status" ||
    columnId === "priority" ||
    columnId === "assignee" ||
    columnId === "category"
  );
}

function statusOptions(
  rows: readonly IssueTableRow[],
  statuses: IssueTableContextStatuses,
  facets: Record<string, number> | undefined,
): FilterOption[] {
  const known = new Set(statuses.map((status) => status.id));
  const extras = new Map<string, string>();

  for (const row of rows) {
    if (!known.has(row.statusId)) {
      extras.set(row.statusId, row.statusName);
    }
  }

  return [
    ...[...statuses]
      .sort((left, right) => left.position - right.position)
      .map((status) => ({
        count: facetCount(facets, status.id),
        id: status.id,
        label: status.name,
      })),
    ...[...extras].map(([id, label]) => ({
      count: facetCount(facets, id),
      id,
      label,
    })),
  ];
}

function parseBound(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

function filterLabel(columnId: string): string {
  return columnId in issueTableColumnLabels
    ? issueTableColumnLabels[columnId as keyof typeof issueTableColumnLabels]
    : columnId;
}

function writeNumberRange(column: FilterColumn, min: string, max: string) {
  const parsedMin = parseBound(min);
  const parsedMax = parseBound(max);

  column.setFilterValue(
    parsedMin === undefined && parsedMax === undefined ? undefined : [parsedMin, parsedMax],
  );
}

const filterInputDelayMs = 300;

function useDebouncedCommit(
  value: string,
  commit: (next: string) => void,
): [string, Dispatch<SetStateAction<string>>] {
  const [draft, setDraft] = useState(value);
  const committed = useRef(value);
  const commitRef = useRef(commit);
  const draftRef = useRef(draft);
  commitRef.current = commit;
  draftRef.current = draft;

  useEffect(() => {
    if (value === committed.current) {
      return;
    }

    committed.current = value;
    // The draft state updates on the next render. Keep the ref in step so
    // unmount cannot commit the previous keystrokes over this value.
    draftRef.current = value;
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === committed.current) {
      return;
    }

    const handle = window.setTimeout(() => {
      committed.current = draft;
      commitRef.current(draft);
    }, filterInputDelayMs);

    return () => {
      window.clearTimeout(handle);
    };
  }, [draft]);

  useEffect(() => {
    return () => {
      if (draftRef.current !== committed.current) {
        const next = draftRef.current;
        committed.current = next;
        commitRef.current(next);
      }
    };
  }, []);

  return [draft, setDraft];
}

function stopMenuKeys(event: KeyboardEvent<HTMLInputElement>) {
  event.stopPropagation();
}

type IssueTableContextStatuses = ReturnType<typeof useIssueTableContext>["statuses"];

export { IssueColumnFilter, type FilterColumn };
