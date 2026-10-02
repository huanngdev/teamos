import {
  formatDateTime,
  getInitials,
  getIssueStatusCategoryLabel,
  type IssueSummary,
} from "@teamos/shared";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  EyeSlashIcon,
  PushPinIcon,
  PushPinSlashIcon,
  UserCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { createColumnHelper } from "@tanstack/react-table";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { issueSelectColumnId } from "../lib/issue-table-pin";
import { IssueColumnFilter } from "./issue-table-filters";
import { IssueIconLabel } from "./issue-field-label";
import { IssuePriorityIcon } from "./issue-priority-icon";
import { IssueStatusIndicator } from "./issue-status-indicator";
import { useIssueTableContext } from "../lib/issue-table-context";
import { issueTableFeatures } from "../lib/issue-table-features";
import {
  comparePriority,
  dateRangeColumnFilter,
  issueTableColumnIds,
  moveIssueTableColumn,
  multiValueColumnFilter,
  numberRangeColumnFilter,
  textColumnFilter,
  unassignedAssigneeId,
  type IssueTableRow,
} from "../lib/issue-table-query";

const columnHelper = createColumnHelper<typeof issueTableFeatures, IssueTableRow>();

const issueTableColumns = columnHelper.columns([
  columnHelper.display({
    cell: ({ row }) => <IssueSelectCell issueId={row.original.id} number={row.original.number} />,
    enableColumnFilter: false,
    enableHiding: false,
    enablePinning: false,
    enableSorting: false,
    header: ({ table }) => (
      <IssueSelectPage ids={table.getRowModel().rows.map((row) => row.original.id)} />
    ),
    id: issueSelectColumnId,
    maxSize: 40,
    minSize: 40,
    size: 40,
  }),
  columnHelper.accessor("number", {
    cell: ({ row }) => (
      <span className="font-mono text-muted-foreground tabular-nums">#{row.original.number}</span>
    ),
    filterFn: numberRangeColumnFilter,
    header: ({ column, table }) => <IssueColumnHeader column={column} label="#" table={table} />,
    id: "number",
    size: 72,
  }),
  columnHelper.accessor("title", {
    cell: ({ row }) => <IssueTitleCell issue={row.original.issue} title={row.original.title} />,
    enableHiding: false,
    filterFn: textColumnFilter,
    header: ({ column, table }) => (
      <IssueColumnHeader column={column} label="Title" table={table} />
    ),
    maxSize: 320,
    minSize: 240,
    size: 320,
  }),
  columnHelper.accessor((row) => row.statusId, {
    cell: ({ row }) => (
      <IssueStatusIndicator category={row.original.category} name={row.original.statusName} />
    ),
    filterFn: multiValueColumnFilter,
    header: ({ column, table }) => (
      <IssueColumnHeader column={column} label="Status" table={table} />
    ),
    id: "status",
    sortFn: (left, right) => left.original.statusPosition - right.original.statusPosition,
  }),
  columnHelper.accessor((row) => row.priority, {
    cell: ({ row }) => <IssuePriorityIcon priority={row.original.priority} />,
    filterFn: multiValueColumnFilter,
    header: ({ column, table }) => (
      <IssueColumnHeader column={column} label="Priority" table={table} />
    ),
    id: "priority",
    sortFn: (left, right) => comparePriority(left.original.priority, right.original.priority),
  }),
  columnHelper.accessor((row) => row.assigneeId, {
    cell: ({ row }) => (
      <IssueAssigneeCell
        image={row.original.assigneeImage}
        name={row.original.assigneeName}
        unassigned={row.original.assigneeId === unassignedAssigneeId}
      />
    ),
    filterFn: multiValueColumnFilter,
    header: ({ column, table }) => (
      <IssueColumnHeader column={column} label="Assignee" table={table} />
    ),
    id: "assignee",
    sortFn: (left, right) => left.original.assigneeName.localeCompare(right.original.assigneeName),
  }),
  columnHelper.accessor((row) => row.category ?? "", {
    cell: ({ row }) =>
      row.original.category === null ? (
        <span className="text-muted-foreground">Unknown column</span>
      ) : (
        <Badge variant="secondary">{getIssueStatusCategoryLabel(row.original.category)}</Badge>
      ),
    filterFn: multiValueColumnFilter,
    header: ({ column, table }) => (
      <IssueColumnHeader column={column} label="Category" table={table} />
    ),
    id: "category",
    sortFn: (left, right) =>
      categoryLabel(left.original).localeCompare(categoryLabel(right.original)),
  }),
  columnHelper.accessor("createdAt", {
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>
    ),
    size: 180,
    filterFn: dateRangeColumnFilter,
    header: ({ column, table }) => (
      <IssueColumnHeader column={column} label="Created" table={table} />
    ),
  }),
  columnHelper.accessor("updatedAt", {
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDateTime(row.original.updatedAt)}</span>
    ),
    size: 180,
    filterFn: dateRangeColumnFilter,
    header: ({ column, table }) => (
      <IssueColumnHeader column={column} label="Updated" table={table} />
    ),
  }),
  columnHelper.accessor("description", {
    cell: ({ row }) =>
      row.original.description.length === 0 ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="block max-w-xs truncate" title={row.original.description}>
          {row.original.description}
        </span>
      ),
    filterFn: textColumnFilter,
    header: ({ column, table }) => (
      <IssueColumnHeader column={column} label="Description" table={table} />
    ),
  }),
]);

interface HeaderColumn {
  clearSorting: () => void;
  getCanHide: () => boolean;
  getCanPin: () => boolean;
  getCanSort: () => boolean;
  getFilterValue: () => unknown;
  getIsPinned: () => "end" | "start" | false;
  getIsSorted: () => "asc" | "desc" | false;
  id: string;
  pin: (position: "end" | "start" | false) => void;
  setFilterValue: (value: unknown) => void;
  toggleSorting: (desc?: boolean) => void;
  toggleVisibility: (visible?: boolean) => void;
}

interface HeaderTable {
  setColumnOrder: (order: string[]) => void;
  store: { readonly state: { columnOrder: string[] } };
}

function IssueSelectCell({ issueId, number }: { issueId: string; number: number }) {
  const { isSelected, toggleSelected } = useIssueTableContext();

  return (
    <Checkbox
      aria-label={`Select issue ${number}`}
      checked={isSelected(issueId)}
      onCheckedChange={(checked) => {
        toggleSelected(issueId, checked === true);
      }}
    />
  );
}

function IssueSelectPage({ ids }: { ids: readonly string[] }) {
  const { isSelected, togglePage } = useIssueTableContext();
  const selectedCount = ids.filter((issueId) => isSelected(issueId)).length;
  const allSelected = ids.length > 0 && selectedCount === ids.length;

  return (
    <Checkbox
      aria-label="Select all issues on this page"
      checked={allSelected}
      indeterminate={selectedCount > 0 && !allSelected}
      onCheckedChange={(checked) => {
        togglePage(ids, checked === true);
      }}
    />
  );
}

function IssueColumnHeader({
  column,
  label,
  table,
}: {
  column: HeaderColumn;
  label: string;
  table: HeaderTable;
}) {
  const sorted = column.getIsSorted();
  const filtered = column.getFilterValue() !== undefined;
  const SortIcon =
    sorted === "asc" ? ArrowUpIcon : sorted === "desc" ? ArrowDownIcon : ArrowsDownUpIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className="w-full justify-between" variant="ghost">
            <span className="truncate">{label}</span>
            <SortIcon data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        {column.getCanSort() ? (
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                column.toggleSorting(false);
              }}
            >
              <ArrowUpIcon data-icon="inline-start" />
              Ascending
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                column.toggleSorting(true);
              }}
            >
              <ArrowDownIcon data-icon="inline-start" />
              Descending
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                column.clearSorting();
              }}
            >
              <XIcon data-icon="inline-start" />
              Reset sort
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Filter</DropdownMenuLabel>
          <IssueColumnFilter column={column} />
          {filtered ? (
            <DropdownMenuItem
              onClick={() => {
                column.setFilterValue(undefined);
              }}
            >
              <XIcon data-icon="inline-start" />
              Clear filter
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              moveColumn(table, column.id, "start");
            }}
          >
            <CaretDoubleLeftIcon data-icon="inline-start" />
            Move to start
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              moveColumn(table, column.id, "left");
            }}
          >
            <CaretLeftIcon data-icon="inline-start" />
            Move left
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              moveColumn(table, column.id, "right");
            }}
          >
            <CaretRightIcon data-icon="inline-start" />
            Move right
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              moveColumn(table, column.id, "end");
            }}
          >
            <CaretDoubleRightIcon data-icon="inline-start" />
            Move to end
          </DropdownMenuItem>
          {column.getCanHide() ? (
            <DropdownMenuItem
              onClick={() => {
                column.toggleVisibility(false);
              }}
            >
              <EyeSlashIcon data-icon="inline-start" />
              Hide column
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        {column.getCanPin() ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  column.pin("start");
                }}
              >
                <PushPinIcon data-icon="inline-start" />
                Pin left
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  column.pin("end");
                }}
              >
                <PushPinIcon data-icon="inline-start" />
                Pin right
              </DropdownMenuItem>
              {column.getIsPinned() === false ? null : (
                <DropdownMenuItem
                  onClick={() => {
                    column.pin(false);
                  }}
                >
                  <PushPinSlashIcon data-icon="inline-start" />
                  Unpin
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IssueTitleCell({ issue, title }: { issue: IssueSummary; title: string }) {
  const { openIssue } = useIssueTableContext();

  return (
    <button
      className="block max-w-full truncate text-left font-medium line-clamp-1"
      onClick={() => {
        openIssue(issue);
      }}
      title={title}
      type="button"
    >
      {title}
    </button>
  );
}

function IssueAssigneeCell({
  image,
  name,
  unassigned,
}: {
  image: string | null;
  name: string;
  unassigned: boolean;
}) {
  if (unassigned) {
    return (
      <span className="min-w-0 text-muted-foreground">
        <IssueIconLabel icon={UserCircleIcon} label={name} />
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="size-6">
        <AvatarImage alt="" src={image ?? undefined} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </span>
  );
}

function categoryLabel(row: IssueTableRow): string {
  return row.category === null ? "Unknown column" : getIssueStatusCategoryLabel(row.category);
}

function moveColumn(
  table: HeaderTable,
  columnId: string,
  direction: "end" | "left" | "right" | "start",
) {
  const current = table.store.state.columnOrder;
  const order = current.length === 0 ? issueTableColumnIds : current;

  table.setColumnOrder(moveIssueTableColumn(order, columnId, direction));
}

export { issueTableColumns };
