import { formatDateTime, formatIssueCode, getIssueStatusCategoryLabel } from "@teamos/shared";
import { createColumnHelper } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { issueSelectColumnId } from "../lib/issue-table-pin";
import { AssigneeFaces } from "./issue-assignee-faces";
import { IssuePriorityIcon } from "./issue-priority-icon";
import { IssueStatusIndicator } from "./issue-status-indicator";
import {
  IssueActionsCell,
  IssueColumnHeader,
  IssueSelectCell,
  IssueSelectPage,
  IssueTitleCell,
} from "./issue-table-columns";
import { issueTableFeatures } from "../lib/issue-table-features";
import {
  assigneeColumnFilter,
  comparePriority,
  dateRangeColumnFilter,
  multiValueColumnFilter,
  numberRangeColumnFilter,
  textColumnFilter,
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
      <span className="font-mono text-muted-foreground tabular-nums">
        {formatIssueCode(row.original.number)}
      </span>
    ),
    filterFn: numberRangeColumnFilter,
    header: ({ column, table }) => <IssueColumnHeader column={column} label="ID" table={table} />,
    id: "number",
    minSize: 104,
    size: 120,
  }),
  columnHelper.accessor("title", {
    cell: ({ row }) => <IssueTitleCell number={row.original.number} title={row.original.title} />,
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
  columnHelper.accessor((row) => row.assigneeIds, {
    cell: ({ row }) => <AssigneeFaces emptyLabel="Unassigned" people={row.original.assignees} />,
    filterFn: assigneeColumnFilter,
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
  columnHelper.accessor("contentText", {
    cell: ({ row }) =>
      row.original.contentText.length === 0 ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="block max-w-xs truncate" title={row.original.contentText}>
          {row.original.contentText}
        </span>
      ),
    filterFn: textColumnFilter,
    header: ({ column, table }) => (
      <IssueColumnHeader column={column} label="Content" table={table} />
    ),
    id: "content",
  }),
  columnHelper.display({
    cell: ({ row }) => <IssueActionsCell issueId={row.original.id} number={row.original.number} />,
    enableColumnFilter: false,
    enableHiding: false,
    enablePinning: true,
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    id: "actions",
    maxSize: 48,
    minSize: 48,
    size: 48,
  }),
]);

function categoryLabel(row: IssueTableRow): string {
  return row.category === null ? "Unknown column" : getIssueStatusCategoryLabel(row.category);
}

export { issueTableColumns };
