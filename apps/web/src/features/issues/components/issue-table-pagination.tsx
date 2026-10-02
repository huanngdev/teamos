import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IssueTable } from "../lib/issue-table-features";
import {
  isIssueTablePageSize,
  issueTablePageSizes,
  visiblePageIndexes,
} from "../lib/issue-table-query";

const pageSizeItems: Record<string, string> = {
  "10": "10",
  "20": "20",
  "50": "50",
};

function IssueTablePagination({ table }: { table: IssueTable }) {
  const { pageIndex, pageSize } = table.state.pagination;
  const rowCount = table.getRowCount();
  const pageCount = table.getPageCount();
  const start = rowCount === 0 ? 0 : pageIndex * pageSize + 1;
  const end = rowCount === 0 ? 0 : Math.min(rowCount, pageIndex * pageSize + pageSize);

  return (
    <div className="flex items-center gap-3 border-t px-2 py-2 text-xs">
      <div className="w-16">
        <Select
          items={pageSizeItems}
          onValueChange={(value) => {
            const parsed = Number(value);

            if (isIssueTablePageSize(parsed)) {
              table.setPageSize(parsed);
            }
          }}
          value={String(pageSize)}
        >
          {/* eslint-disable-next-line shadcn/no-restyle -- page chrome is xs; Select has no xs size */}
          <SelectTrigger aria-label="Rows per page" className="w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {issueTablePageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {pageSizeItems[String(size)]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {start}–{end} of {rowCount} rows
      </span>
      <Pagination className="mx-0 ml-auto w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <Button
              aria-label="First page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => {
                table.firstPage();
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <CaretDoubleLeftIcon />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              aria-label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => {
                table.previousPage();
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <CaretLeftIcon />
            </Button>
          </PaginationItem>
          {visiblePageIndexes(pageCount, pageIndex).map((index) => (
            <PaginationItem key={index}>
              <Button
                aria-current={index === pageIndex ? "page" : undefined}
                aria-label={`Page ${index + 1}`}
                onClick={() => {
                  table.setPageIndex(index);
                }}
                size="icon"
                type="button"
                variant="outline"
              >
                {index + 1}
              </Button>
            </PaginationItem>
          ))}
          <PaginationItem>
            <Button
              aria-label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => {
                table.nextPage();
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <CaretRightIcon />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              aria-label="Last page"
              disabled={!table.getCanLastPage()}
              onClick={() => {
                table.lastPage();
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <CaretDoubleRightIcon />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export { IssueTablePagination };
