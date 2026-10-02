import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
  CalendarBlankIcon,
  CellSignalHighIcon,
  CircleIcon,
  ClockIcon,
  ColumnsIcon,
  FunnelIcon,
  HashIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TagIcon,
  TextAlignLeftIcon,
  TextTIcon,
  TrashIcon,
  UserCircleIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { IssueTable } from "../lib/issue-table-features";
import {
  defaultIssueTableSort,
  issueTableColumnLabels,
  type IssueTableColumnId,
} from "../lib/issue-table-query";
import { IssueColumnFilter, type FilterColumn } from "./issue-table-filters";

interface IssueTableToolbarProps {
  canCreate: boolean;
  canDelete: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  onClearSearch: () => void;
  onCreate: () => void;
  onDeleteSelected: () => void;
  onSearchChange: (value: string) => void;
  search: string;
  selectedCount: number;
  table: IssueTable;
}

function columnLabel(columnId: string): string {
  if (isColumnLabel(columnId)) {
    return issueTableColumnLabels[columnId];
  }

  return columnId;
}

const filterColumnIcons: Record<IssueTableColumnId, Icon> = {
  assignee: UserCircleIcon,
  category: TagIcon,
  createdAt: CalendarBlankIcon,
  description: TextAlignLeftIcon,
  number: HashIcon,
  priority: CellSignalHighIcon,
  status: CircleIcon,
  title: TextTIcon,
  updatedAt: ClockIcon,
};

function isColumnLabel(columnId: string): columnId is IssueTableColumnId {
  return Object.hasOwn(issueTableColumnLabels, columnId);
}

function IssueTableToolbar({
  canCreate,
  canDelete,
  hasFilters,
  onClearFilters,
  onClearSearch,
  onCreate,
  onDeleteSelected,
  onSearchChange,
  search,
  selectedCount,
  table,
}: IssueTableToolbarProps) {
  const filterCount = table.state.columnFilters.length;
  const activeSort = table.state.sorting[0];
  const SortIcon = activeSort?.desc === true ? ArrowDownIcon : ArrowUpIcon;
  const isDefaultSort =
    activeSort?.id === defaultIssueTableSort.id && activeSort.desc === defaultIssueTableSort.desc;

  const deleteLabel = selectedCount === 1 ? "Delete 1 issue" : `Delete ${selectedCount} issues`;

  return (
    <div className="flex flex-wrap items-center gap-2 px-2 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-56">
          <InputGroup>
            <InputGroupAddon>
              <MagnifyingGlassIcon />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search issues"
              onChange={(event) => {
                onSearchChange(event.target.value);
              }}
              placeholder="Search issues"
              value={search}
            />
            {search.length > 0 ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton aria-label="Clear search" onClick={onClearSearch} size="icon-xs">
                  <XIcon />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="outline">
                <FunnelIcon data-icon="inline-start" />
                {filterCount > 0 ? `Filter (${filterCount})` : "Filter"}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanFilter())
                .map((column) => {
                  const count = selectedFilterCount(column.getFilterValue());
                  const label = columnLabel(column.id);

                  return (
                    <DropdownMenuSub key={column.id}>
                      <DropdownMenuSubTrigger>
                        <FilterColumnIcon columnId={column.id} />
                        {count > 0 ? `${label} (${count})` : label}
                      </DropdownMenuSubTrigger>
                      <FilterSubmenu column={column} />
                    </DropdownMenuSub>
                  );
                })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="outline">
                <ColumnsIcon data-icon="inline-start" />
                Layout
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Columns</DropdownMenuLabel>
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    checked={column.getIsVisible()}
                    key={column.id}
                    onCheckedChange={(checked) => {
                      column.toggleVisibility(checked === true);
                    }}
                  >
                    {columnLabel(column.id)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="outline">
                <SortIcon data-icon="inline-start" />
                Sort
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanSort())
                .map((column) => {
                  const sorted = column.getIsSorted();

                  return (
                    <DropdownMenuItem
                      key={column.id}
                      onClick={() => {
                        column.toggleSorting(sorted === "asc");
                      }}
                    >
                      {sorted === "asc" ? (
                        <ArrowUpIcon data-icon="inline-start" />
                      ) : sorted === "desc" ? (
                        <ArrowDownIcon data-icon="inline-start" />
                      ) : (
                        <ArrowsDownUpIcon data-icon="inline-start" />
                      )}
                      {columnLabel(column.id)}
                    </DropdownMenuItem>
                  );
                })}
            </DropdownMenuGroup>
            {isDefaultSort ? null : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      table.setSorting([]);
                    }}
                  >
                    <XIcon data-icon="inline-start" />
                    Reset sort
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {hasFilters ? (
          <Button onClick={onClearFilters} type="button" variant="destructive">
            <XIcon data-icon="inline-start" />
            Clear filters
          </Button>
        ) : null}
        {canDelete && selectedCount > 0 ? (
          <Button onClick={onDeleteSelected} type="button" variant="destructive">
            <TrashIcon data-icon="inline-start" />
            {deleteLabel}
          </Button>
        ) : null}
      </div>
      {canCreate ? (
        <Button className="ml-auto" onClick={onCreate} type="button">
          <PlusIcon data-icon="inline-start" />
          New issue
        </Button>
      ) : null}
    </div>
  );
}

function FilterSubmenu({ column }: { column: FilterColumn }) {
  if (column.id === "createdAt" || column.id === "updatedAt") {
    return (
      <DropdownMenuSubContent className="w-auto">
        <IssueColumnFilter column={column} />
      </DropdownMenuSubContent>
    );
  }

  if (column.id === "assignee") {
    return (
      <DropdownMenuSubContent className="w-80">
        <IssueColumnFilter column={column} />
      </DropdownMenuSubContent>
    );
  }

  return (
    <DropdownMenuSubContent className="w-64">
      <IssueColumnFilter column={column} />
    </DropdownMenuSubContent>
  );
}

function selectedFilterCount(value: unknown): number {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined && item !== null && String(item).length > 0)
      .length;
  }

  if (typeof value === "string") {
    return value.length > 0 ? 1 : 0;
  }

  if (typeof value === "number") {
    return 1;
  }

  return 0;
}

function FilterColumnIcon({ columnId }: { columnId: string }) {
  if (!isColumnLabel(columnId)) {
    return null;
  }

  const Icon = filterColumnIcons[columnId];

  return <Icon />;
}

export { IssueTableToolbar };
