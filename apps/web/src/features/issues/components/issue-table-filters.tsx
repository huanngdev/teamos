import type { KeyboardEvent } from "react";
import {
  getIssuePriorityLabel,
  getIssueStatusCategoryLabel,
  issuePriorities,
  issueStatusCategories,
} from "@teamos/shared";

import { DropdownMenuCheckboxItem, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useIssueTableContext } from "../lib/issue-table-context";
import {
  countRowsBy,
  issueTableColumnLabels,
  unassignedAssigneeId,
  type IssueTableRow,
} from "../lib/issue-table-query";

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

function MultiValueFilter({
  column,
  options,
}: {
  column: FilterColumn;
  options: readonly FilterOption[];
}) {
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
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            <span className="text-muted-foreground tabular-nums">{option.count}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </div>
    </DropdownMenuGroup>
  );
}

function TextFilter({ column }: { column: FilterColumn }) {
  const value = column.getFilterValue();

  return (
    <div className="p-1">
      <Input
        aria-label={`Filter ${filterLabel(column.id)}`}
        onChange={(event) => {
          column.setFilterValue(event.target.value.length > 0 ? event.target.value : undefined);
        }}
        onKeyDown={stopMenuKeys}
        placeholder="Contains..."
        value={typeof value === "string" ? value : ""}
      />
    </div>
  );
}

function NumberRangeFilter({ column }: { column: FilterColumn }) {
  const value = column.getFilterValue();
  const min = Array.isArray(value) ? readBound(value[0]) : "";
  const max = Array.isArray(value) ? readBound(value[1]) : "";

  const update = (nextMin: string, nextMax: string) => {
    const parsedMin = parseBound(nextMin);
    const parsedMax = parseBound(nextMax);

    column.setFilterValue(
      parsedMin === undefined && parsedMax === undefined ? undefined : [parsedMin, parsedMax],
    );
  };

  return (
    <div className="flex items-center gap-2 p-1">
      <Input
        aria-label="Minimum number"
        min={1}
        onChange={(event) => {
          update(event.target.value, max);
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
          update(min, event.target.value);
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
    <div className="flex flex-col gap-2 p-1">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">From</span>
        <Input
          aria-label="From"
          onChange={(event) => {
            update(event.target.value, to);
          }}
          onKeyDown={stopMenuKeys}
          type="date"
          value={from}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">To</span>
        <Input
          aria-label="To"
          onChange={(event) => {
            update(from, event.target.value);
          }}
          onKeyDown={stopMenuKeys}
          type="date"
          value={to}
        />
      </label>
    </div>
  );
}

function useFilterOptions(columnId: string): FilterOption[] | null {
  const { facets, members, rows, statuses } = useIssueTableContext();

  if (!isMultiColumn(columnId)) {
    return null;
  }

  if (columnId === "status") {
    return statusOptions(rows, statuses, facets?.status);
  }

  if (columnId === "assignee") {
    return assigneeOptions(rows, members, facets?.assignee);
  }

  if (columnId === "priority") {
    const counts = countRowsBy(rows, (row) => row.priority);

    return issuePriorities.map((priority) => ({
      count: facetCount(facets?.priority, counts, priority),
      id: priority,
      label: getIssuePriorityLabel(priority),
    }));
  }

  const counts = countRowsBy(rows, (row) => row.category ?? "");

  return issueStatusCategories.map((category) => ({
    count: facetCount(facets?.category, counts, category),
    id: category,
    label: getIssueStatusCategoryLabel(category),
  }));
}

function facetCount(
  facets: Record<string, number> | undefined,
  fallback: Map<string, number>,
  id: string,
): number {
  if (facets !== undefined) {
    return facets[id] ?? 0;
  }

  return fallback.get(id) ?? 0;
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
  const counts = countRowsBy(rows, (row) => row.statusId);
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
        count: facetCount(facets, counts, status.id),
        id: status.id,
        label: status.name,
      })),
    ...[...extras].map(([id, label]) => ({
      count: facetCount(facets, counts, id),
      id,
      label,
    })),
  ];
}

function assigneeOptions(
  rows: readonly IssueTableRow[],
  members: IssueTableContextMembers,
  facets: Record<string, number> | undefined,
): FilterOption[] {
  const counts = countRowsBy(rows, (row) => row.assigneeId);
  const known = new Set(members.map((member) => member.memberId));
  const extras = new Map<string, string>();

  for (const row of rows) {
    if (row.assigneeId !== unassignedAssigneeId && !known.has(row.assigneeId)) {
      extras.set(row.assigneeId, row.assigneeName);
    }
  }

  return [
    {
      count: facetCount(facets, counts, unassignedAssigneeId),
      id: unassignedAssigneeId,
      label: "Unassigned",
    },
    ...[...members]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((member) => ({
        count: facetCount(facets, counts, member.memberId),
        id: member.memberId,
        label: member.name,
      })),
    ...[...extras].map(([id, label]) => ({
      count: facetCount(facets, counts, id),
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

function stopMenuKeys(event: KeyboardEvent<HTMLInputElement>) {
  event.stopPropagation();
}

type IssueTableContextMembers = ReturnType<typeof useIssueTableContext>["members"];
type IssueTableContextStatuses = ReturnType<typeof useIssueTableContext>["statuses"];

export { IssueColumnFilter, type FilterColumn };
