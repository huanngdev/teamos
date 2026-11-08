import { formatIssueCode } from "@teamos/shared";
import { Link } from "react-router";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  DotsThreeIcon,
  EyeSlashIcon,
  NoteIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";

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
import { IssueColumnFilter } from "./issue-table-filters";
import { useIssueTableContext } from "../lib/issue-table-context";
import { issueTableColumnIds, moveIssueTableColumn } from "../lib/issue-table-query";

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

function IssueSelectCell({ issueId, number }: { issueId: string; number: string }) {
  const { isSelected, toggleSelected } = useIssueTableContext();

  return (
    <Checkbox
      aria-label={`Select issue ${formatIssueCode(number)}`}
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
      <DropdownMenuContent align="start" className="w-80">
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
              variant="destructive"
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

function IssueTitleCell({ number, title }: { number: string; title: string }) {
  const { issueHref } = useIssueTableContext();
  const code = formatIssueCode(number);

  return (
    <Link
      className="block min-w-0 truncate text-left font-medium line-clamp-1"
      data-issue-path={code}
      state={{ issueReturn: true }}
      title={title}
      to={issueHref(number)}
    >
      {title}
    </Link>
  );
}

function IssueActionsCell({ issueId, number }: { issueId: string; number: string }) {
  const { canDelete, canUpdate, onDeleteIssue, onQuickEdit } = useIssueTableContext();
  const code = formatIssueCode(number);

  if (!canDelete && !canUpdate) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button aria-label={`${code} actions`} size="icon" type="button" variant="ghost">
            <DotsThreeIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-auto" side="left">
        <DropdownMenuGroup>
          {canUpdate ? (
            <DropdownMenuItem
              onClick={() => {
                onQuickEdit(issueId);
              }}
            >
              <NoteIcon data-icon="inline-start" />
              Edit
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem
              onClick={() => {
                onDeleteIssue(issueId);
              }}
              variant="destructive"
            >
              <TrashIcon data-icon="inline-start" />
              Delete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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

export { IssueActionsCell, IssueColumnHeader, IssueSelectCell, IssueSelectPage, IssueTitleCell };
