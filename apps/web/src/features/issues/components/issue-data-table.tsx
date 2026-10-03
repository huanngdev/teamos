/*
 * Sticky header and pinned columns need an opaque background and a measured
 * offset. The table primitive does not provide either, and components/ui stays
 * untouched.
 */
/* eslint-disable shadcn/no-inline-styles, shadcn/no-restyle */
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "cn";
import { useEffect } from "react";
import { useIssueTableContext } from "../lib/issue-table-context";
import type { IssueTable } from "../lib/issue-table-features";
import { issueTablePinStyle } from "../lib/issue-table-pin";

function IssueDataTable({ table }: { table: IssueTable }) {
  const rows = table.getRowModel().rows;
  const filtered =
    (typeof table.state.globalFilter === "string" && table.state.globalFilter.length > 0) ||
    table.state.columnFilters.length > 0;
  const { highlightedIssueId, isSelected } = useIssueTableContext();

  useEffect(() => {
    if (highlightedIssueId === null) {
      return;
    }

    const row = document.querySelector(`[data-issue-id="${CSS.escape(highlightedIssueId)}"]`);

    if (row === null || typeof row.scrollIntoView !== "function") {
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [highlightedIssueId]);
  const startEdge = table.getStartVisibleLeafColumns().at(-1)?.id;
  const endEdge = table.getEndVisibleLeafColumns()[0]?.id;

  return (
    <Table aria-label="Issues">
      <TableHeader className="sticky top-0 z-20 bg-background [&_tr]:border-0">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const pinned = header.column.getIsPinned();

              return (
                <TableHead
                  className={cn(
                    "sticky top-0 bg-background",
                    pinned === "start" && "z-30",
                    pinned === "end" && "z-30",
                    header.column.id === startEdge && "border-r",
                    header.column.id === endEdge && "border-l",
                  )}
                  colSpan={header.colSpan}
                  key={header.id}
                  style={{
                    ...issueTablePinStyle(header.column),
                    // Collapsed table borders detach from sticky cells while scrolling.
                    boxShadow: "inset 0 1px 0 0 var(--border), inset 0 -1px 0 0 var(--border)",
                  }}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={Math.max(table.getVisibleLeafColumns().length, 1)}>
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>{filtered ? "No matching issues" : "No issues yet"}</EmptyTitle>
                  <EmptyDescription>
                    {filtered ? "Try a different search or filter." : "This project has no issues."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              className={cn(
                "group hover:bg-transparent data-[state=selected]:bg-transparent",
                row.original.id === highlightedIssueId && "bg-accent/60",
              )}
              data-issue-id={row.original.id}
              data-state={isSelected(row.original.id) ? "selected" : undefined}
              key={row.id}
            >
              {row.getVisibleCells().map((cell) => {
                const pinned = cell.column.getIsPinned();

                return (
                  <TableCell
                    className={cn(
                      pinned !== false
                        ? "issue-table-pin sticky z-20"
                        : "relative z-0 bg-background group-hover:bg-muted/50 group-data-[state=selected]:bg-muted",
                      cell.column.id === startEdge && "border-r",
                      cell.column.id === endEdge && "border-l",
                      cell.column.id === "title" && "max-w-80 whitespace-normal",
                    )}
                    key={cell.id}
                    style={issueTablePinStyle(cell.column)}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export { IssueDataTable };
