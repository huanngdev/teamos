import {
  getIssuePriorityLabel,
  getIssueStatusCategoryLabel,
  issuePrioritySchema,
  issueStatusCategorySchema,
  unassignedAssigneeId,
  type IssuePriority,
  type IssueStatusCategory,
  type IssueSummary,
  type ProjectMember,
  type ProjectStatusSummary,
} from "@teamos/shared";

const issueTableColumnIds = [
  "number",
  "title",
  "status",
  "priority",
  "assignee",
  "category",
  "createdAt",
  "updatedAt",
  "description",
] as const;

type IssueTableColumnId = (typeof issueTableColumnIds)[number];

const issueTableColumnLabels: Record<IssueTableColumnId, string> = {
  assignee: "Assignee",
  category: "Category",
  createdAt: "Created",
  description: "Description",
  number: "Number",
  priority: "Priority",
  status: "Status",
  title: "Title",
  updatedAt: "Updated",
};

const issueTablePageSizes = [10, 20, 50] as const;

type IssueTablePageSize = (typeof issueTablePageSizes)[number];

const defaultIssueTablePageSize: IssueTablePageSize = 20;

const defaultHiddenIssueColumns: readonly IssueTableColumnId[] = ["category", "description"];

const defaultIssueTableSort = { desc: true, id: "createdAt" } as const;

const priorityRank: Record<IssuePriority, number> = {
  high: 3,
  low: 1,
  medium: 2,
  none: 0,
  urgent: 4,
};

interface IssueTableFilter {
  id: IssueTableColumnId;
  value: unknown;
}

interface IssueTableSort {
  desc: boolean;
  id: IssueTableColumnId;
}

interface IssueTableQuery {
  columnFilters: IssueTableFilter[];
  columnOrder: IssueTableColumnId[];
  columnVisibility: Record<string, boolean>;
  pageIndex: number;
  pageSize: number;
  q: string;
  sorting: IssueTableSort[];
}

interface IssueTableRow {
  assigneeEmail: string;
  assigneeId: string;
  assigneeImage: string | null;
  assigneeName: string;
  category: IssueStatusCategory | null;
  createdAt: string;
  description: string;
  id: string;
  issue: IssueSummary;
  number: number;
  priority: IssuePriority;
  statusId: string;
  statusName: string;
  statusPosition: number;
  title: string;
  updatedAt: string;
}

interface FilterRow {
  getValue: (columnId: string) => unknown;
}

function isIssueTableColumnId(value: string): value is IssueTableColumnId {
  return issueTableColumnIds.some((columnId) => columnId === value);
}

function isIssueTablePageSize(value: number): value is IssueTablePageSize {
  return issueTablePageSizes.some((pageSize) => pageSize === value);
}

function defaultIssueTableQuery(): IssueTableQuery {
  return {
    columnFilters: [],
    columnOrder: [...issueTableColumnIds],
    columnVisibility: visibilityFromHidden(defaultHiddenIssueColumns),
    pageIndex: 0,
    pageSize: defaultIssueTablePageSize,
    q: "",
    sorting: [{ ...defaultIssueTableSort }],
  };
}

function visibilityFromHidden(hidden: readonly IssueTableColumnId[]): Record<string, boolean> {
  return Object.fromEntries(hidden.map((columnId) => [columnId, false]));
}

function hiddenFromVisibility(visibility: Record<string, boolean>): IssueTableColumnId[] {
  return issueTableColumnIds.filter(
    (columnId) => columnId !== "title" && visibility[columnId] === false,
  );
}

function sameColumnList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isSameSort(sort: IssueTableSort): boolean {
  return sort.id === defaultIssueTableSort.id && sort.desc === defaultIssueTableSort.desc;
}

function parseList(value: string | null): string[] {
  if (value === null || value.length === 0) {
    return [];
  }

  const seen = new Set<string>();

  return value.split(",").flatMap((item) => {
    const trimmed = item.trim();

    if (trimmed.length === 0 || seen.has(trimmed)) {
      return [];
    }

    seen.add(trimmed);

    return [trimmed];
  });
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);

  return (
    date.getFullYear() === year && date.getMonth() === (month ?? 1) - 1 && date.getDate() === day
  );
}

function parseBound(value: string, accept: (bound: string) => boolean): string | undefined {
  if (value.length === 0) {
    return undefined;
  }

  return accept(value) ? value : undefined;
}

function parseRange(
  value: string | null,
  accept: (bound: string) => boolean,
): [string?, string?] | undefined {
  if (value === null || value.length === 0) {
    return undefined;
  }

  const parts = value.split("..");

  if (parts.length !== 2) {
    return undefined;
  }

  const from = parseBound(parts[0] ?? "", accept);
  const to = parseBound(parts[1] ?? "", accept);

  if (from === undefined && to === undefined) {
    return undefined;
  }

  return [from, to];
}

function parsePositiveInteger(value: string): number | undefined {
  if (!/^\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

function parseNumberRange(value: string | null): [number?, number?] | undefined {
  const range = parseRange(value, (bound) => parsePositiveInteger(bound) !== undefined);

  if (range === undefined) {
    return undefined;
  }

  return [
    range[0] === undefined ? undefined : Number(range[0]),
    range[1] === undefined ? undefined : Number(range[1]),
  ];
}

function parseColumnOrder(value: string | null): IssueTableColumnId[] {
  const requested = parseList(value).filter(isIssueTableColumnId);
  const rest = issueTableColumnIds.filter((columnId) => !requested.includes(columnId));

  return [...requested, ...rest];
}

function parseHidden(params: URLSearchParams): IssueTableColumnId[] {
  if (!params.has("hide")) {
    return [...defaultHiddenIssueColumns];
  }

  return parseList(params.get("hide")).filter(
    (columnId): columnId is IssueTableColumnId =>
      isIssueTableColumnId(columnId) && columnId !== "title",
  );
}

function parseSort(value: string | null): IssueTableSort[] {
  if (value === null || value.length === 0) {
    return [{ ...defaultIssueTableSort }];
  }

  const [id, direction] = value.split(".");

  if (
    id === undefined ||
    !isIssueTableColumnId(id) ||
    (direction !== "asc" && direction !== "desc")
  ) {
    return [{ ...defaultIssueTableSort }];
  }

  return [{ desc: direction === "desc", id }];
}

function parsePageIndex(value: string | null): number {
  const parsed = value === null ? undefined : parsePositiveInteger(value);

  if (parsed === undefined || parsed > 10_000) {
    return 0;
  }

  return parsed - 1;
}

function parsePageSize(value: string | null): number {
  const parsed = value === null ? undefined : Number(value);

  if (parsed === undefined || !Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    return defaultIssueTablePageSize;
  }

  return parsed;
}

function parseIssueTableSearch(params: URLSearchParams): IssueTableQuery {
  const filters: IssueTableFilter[] = [];
  const status = parseList(params.get("status"));

  if (status.length > 0) {
    filters.push({ id: "status", value: status });
  }

  const priority = parseList(params.get("priority")).flatMap((value) => {
    const parsed = issuePrioritySchema.safeParse(value);

    return parsed.success ? [parsed.data] : [];
  });

  if (priority.length > 0) {
    filters.push({ id: "priority", value: priority });
  }

  const assignee = parseList(params.get("assignee"));

  if (assignee.length > 0) {
    filters.push({ id: "assignee", value: assignee });
  }

  const category = parseList(params.get("category")).flatMap((value) => {
    const parsed = issueStatusCategorySchema.safeParse(value);

    return parsed.success ? [parsed.data] : [];
  });

  if (category.length > 0) {
    filters.push({ id: "category", value: category });
  }

  const title = params.get("title")?.trim() ?? "";

  if (title.length > 0) {
    filters.push({ id: "title", value: title.slice(0, 140) });
  }

  const description = params.get("description")?.trim() ?? "";

  if (description.length > 0) {
    filters.push({ id: "description", value: description.slice(0, 200) });
  }

  const number = parseNumberRange(params.get("number"));

  if (number !== undefined) {
    filters.push({ id: "number", value: number });
  }

  const createdAt = parseRange(params.get("created"), isDateKey);

  if (createdAt !== undefined) {
    filters.push({ id: "createdAt", value: createdAt });
  }

  const updatedAt = parseRange(params.get("updated"), isDateKey);

  if (updatedAt !== undefined) {
    filters.push({ id: "updatedAt", value: updatedAt });
  }

  return {
    columnFilters: filters,
    columnOrder: parseColumnOrder(params.get("cols")),
    columnVisibility: visibilityFromHidden(parseHidden(params)),
    pageIndex: parsePageIndex(params.get("page")),
    pageSize: parsePageSize(params.get("pageSize")),
    q: (params.get("q") ?? "").trim().slice(0, 140),
    sorting: parseSort(params.get("sort")),
  };
}

function formatRange(
  from: number | string | undefined,
  to: number | string | undefined,
): string | undefined {
  if (from === undefined && to === undefined) {
    return undefined;
  }

  return `${from ?? ""}..${to ?? ""}`;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function readRange(value: unknown): [unknown?, unknown?] | undefined {
  if (!Array.isArray(value) || value.length < 2) {
    return undefined;
  }

  return [value[0], value[1]];
}

function serializeIssueTableSearch(query: IssueTableQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.q.length > 0) {
    params.set("q", query.q);
  }

  const sort = query.sorting[0];

  if (sort !== undefined && !isSameSort(sort)) {
    params.set("sort", `${sort.id}.${sort.desc ? "desc" : "asc"}`);
  }

  if (query.pageIndex > 0) {
    params.set("page", String(query.pageIndex + 1));
  }

  if (query.pageSize !== defaultIssueTablePageSize) {
    params.set("pageSize", String(query.pageSize));
  }

  for (const filter of query.columnFilters) {
    if (
      filter.id === "status" ||
      filter.id === "priority" ||
      filter.id === "assignee" ||
      filter.id === "category"
    ) {
      const values = readStringList(filter.value);

      if (values.length > 0) {
        params.set(filter.id, values.join(","));
      }
    }

    if (filter.id === "title" || filter.id === "description") {
      if (typeof filter.value === "string" && filter.value.trim().length > 0) {
        params.set(filter.id, filter.value.trim());
      }
    }

    if (filter.id === "number") {
      const range = readRange(filter.value);
      const formatted = formatRange(
        typeof range?.[0] === "number" ? range[0] : undefined,
        typeof range?.[1] === "number" ? range[1] : undefined,
      );

      if (formatted !== undefined) {
        params.set("number", formatted);
      }
    }

    if (filter.id === "createdAt" || filter.id === "updatedAt") {
      const range = readRange(filter.value);
      const formatted = formatRange(
        typeof range?.[0] === "string" ? range[0] : undefined,
        typeof range?.[1] === "string" ? range[1] : undefined,
      );

      if (formatted !== undefined) {
        params.set(filter.id === "createdAt" ? "created" : "updated", formatted);
      }
    }
  }

  const hidden = hiddenFromVisibility(query.columnVisibility);

  if (!sameColumnList(hidden, defaultHiddenIssueColumns)) {
    params.set("hide", hidden.join(","));
  }

  if (!sameColumnList(query.columnOrder, issueTableColumnIds)) {
    params.set("cols", query.columnOrder.join(","));
  }

  return params;
}

function buildIssueTableRows(
  issues: readonly IssueSummary[],
  statuses: readonly ProjectStatusSummary[],
  members: readonly ProjectMember[],
): IssueTableRow[] {
  const statusById = new Map(statuses.map((status) => [status.id, status]));
  const memberById = new Map(members.map((member) => [member.memberId, member]));

  return issues.map((issue) => {
    const status = statusById.get(issue.statusId);
    const member =
      issue.assigneeMemberId === null ? undefined : memberById.get(issue.assigneeMemberId);
    const assignee = issue.assignee;

    return {
      assigneeEmail: assignee?.email ?? member?.email ?? "",
      assigneeId: issue.assigneeMemberId ?? unassignedAssigneeId,
      assigneeImage: assignee?.image ?? member?.image ?? null,
      assigneeName:
        issue.assigneeMemberId === null
          ? "Unassigned"
          : (assignee?.name ?? member?.name ?? "Unknown member"),
      category: status?.category ?? null,
      createdAt: issue.createdAt,
      description: issue.description ?? "",
      id: issue.id,
      issue,
      number: issue.number,
      priority: issue.priority,
      statusId: issue.statusId,
      statusName: status?.name ?? "Unknown column",
      statusPosition: status?.position ?? Number.MAX_SAFE_INTEGER,
      title: issue.title,
      updatedAt: issue.updatedAt,
    };
  });
}

function matchesIssueSearch(row: IssueTableRow, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (needle.length === 0) {
    return true;
  }

  const category = row.category === null ? "" : getIssueStatusCategoryLabel(row.category);
  const haystack = [
    row.title,
    row.description,
    String(row.number),
    `#${row.number}`,
    row.statusName,
    getIssuePriorityLabel(row.priority),
    row.assigneeName,
    row.assigneeEmail,
    category,
  ]
    .join("\n")
    .toLowerCase();

  return haystack.includes(needle);
}

function matchesMultiValue(value: unknown, selected: unknown): boolean {
  if (!Array.isArray(selected) || selected.length === 0) {
    return true;
  }

  return selected.includes(value);
}

function matchesText(value: unknown, needle: unknown): boolean {
  if (typeof needle !== "string" || needle.trim().length === 0) {
    return true;
  }

  return String(value ?? "")
    .toLowerCase()
    .includes(needle.trim().toLowerCase());
}

function matchesNumberRange(value: unknown, range: unknown): boolean {
  const bounds = readRange(range);

  if (bounds === undefined) {
    return true;
  }

  const number = typeof value === "number" ? value : Number.NaN;
  const min = typeof bounds[0] === "number" ? bounds[0] : undefined;
  const max = typeof bounds[1] === "number" ? bounds[1] : undefined;

  if (!Number.isFinite(number)) {
    return false;
  }

  if (min !== undefined && number < min) {
    return false;
  }

  if (max !== undefined && number > max) {
    return false;
  }

  return true;
}

function localDateKey(value: string): string | undefined {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function matchesDateRange(value: unknown, range: unknown): boolean {
  const bounds = readRange(range);

  if (bounds === undefined) {
    return true;
  }

  const key = typeof value === "string" ? localDateKey(value) : undefined;
  const from = typeof bounds[0] === "string" ? bounds[0] : undefined;
  const to = typeof bounds[1] === "string" ? bounds[1] : undefined;

  if (key === undefined) {
    return false;
  }

  if (from !== undefined && key < from) {
    return false;
  }

  if (to !== undefined && key > to) {
    return false;
  }

  return true;
}

function multiValueColumnFilter(row: FilterRow, columnId: string, filterValue: unknown): boolean {
  return matchesMultiValue(row.getValue(columnId), filterValue);
}

multiValueColumnFilter.autoRemove = (filterValue: unknown) =>
  !Array.isArray(filterValue) || filterValue.length === 0;

function textColumnFilter(row: FilterRow, columnId: string, filterValue: unknown): boolean {
  return matchesText(row.getValue(columnId), filterValue);
}

textColumnFilter.autoRemove = (filterValue: unknown) =>
  typeof filterValue !== "string" || filterValue.trim().length === 0;

function numberRangeColumnFilter(row: FilterRow, columnId: string, filterValue: unknown): boolean {
  return matchesNumberRange(row.getValue(columnId), filterValue);
}

numberRangeColumnFilter.autoRemove = (filterValue: unknown) => {
  const range = readRange(filterValue);

  return range === undefined || (typeof range[0] !== "number" && typeof range[1] !== "number");
};

function dateRangeColumnFilter(row: FilterRow, columnId: string, filterValue: unknown): boolean {
  return matchesDateRange(row.getValue(columnId), filterValue);
}

dateRangeColumnFilter.autoRemove = (filterValue: unknown) => {
  const range = readRange(filterValue);

  return range === undefined || (typeof range[0] !== "string" && typeof range[1] !== "string");
};

function issueGlobalFilter(
  row: { original: IssueTableRow },
  _columnId: string,
  filterValue: unknown,
): boolean {
  return matchesIssueSearch(row.original, typeof filterValue === "string" ? filterValue : "");
}

function comparePriority(left: IssuePriority, right: IssuePriority): number {
  return priorityRank[left] - priorityRank[right];
}

function moveIssueTableColumn(
  order: readonly string[],
  columnId: string,
  direction: "end" | "left" | "right" | "start",
): IssueTableColumnId[] {
  const current = parseColumnOrder(order.join(","));
  const from = current.indexOf(columnId as IssueTableColumnId);

  if (from === -1) {
    return current;
  }

  const to =
    direction === "left"
      ? from - 1
      : direction === "right"
        ? from + 1
        : direction === "start"
          ? 0
          : current.length - 1;

  if (to < 0 || to >= current.length || to === from) {
    return current;
  }

  const next = [...current];
  const [moved] = next.splice(from, 1);

  if (moved === undefined) {
    return current;
  }

  next.splice(to, 0, moved);

  return next;
}

function visiblePageIndexes(pageCount: number, pageIndex: number): number[] {
  if (pageCount <= 0) {
    return [];
  }

  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index);
  }

  const start = Math.max(0, Math.min(pageIndex - 3, pageCount - 7));

  return Array.from({ length: 7 }, (_, index) => start + index);
}

function issueTableHasFilters(query: IssueTableQuery): boolean {
  return query.q.length > 0 || query.columnFilters.length > 0;
}

const issueListFilterKeys = [
  "assignee",
  "category",
  "created",
  "description",
  "number",
  "priority",
  "q",
  "status",
  "title",
  "updated",
] as const;

function issueListRequestParams(query: IssueTableQuery, timeZone: string): Record<string, string> {
  const serialized = serializeIssueTableSearch(query);
  const sort = query.sorting[0] ?? defaultIssueTableSort;
  const params: Record<string, string> = {
    direction: sort.desc ? "desc" : "asc",
    facets: "1",
    page: String(query.pageIndex + 1),
    pageSize: String(query.pageSize),
    sort: sort.id,
    timeZone,
  };

  for (const key of issueListFilterKeys) {
    const value = serialized.get(key);

    if (value !== null && value.length > 0) {
      params[key] = value;
    }
  }

  return params;
}

function countRowsBy(
  rows: readonly IssueTableRow[],
  select: (row: IssueTableRow) => string,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = select(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export {
  buildIssueTableRows,
  comparePriority,
  countRowsBy,
  dateRangeColumnFilter,
  defaultHiddenIssueColumns,
  defaultIssueTablePageSize,
  defaultIssueTableQuery,
  defaultIssueTableSort,
  issueGlobalFilter,
  issueListRequestParams,
  issueTableColumnIds,
  issueTableColumnLabels,
  issueTableHasFilters,
  issueTablePageSizes,
  localDateKey,
  matchesDateRange,
  matchesIssueSearch,
  matchesNumberRange,
  moveIssueTableColumn,
  multiValueColumnFilter,
  numberRangeColumnFilter,
  isIssueTableColumnId,
  isIssueTablePageSize,
  parseIssueTableSearch,
  serializeIssueTableSearch,
  textColumnFilter,
  unassignedAssigneeId,
  visiblePageIndexes,
  type IssueTableColumnId,
  type IssueTablePageSize,
  type IssueTableQuery,
  type IssueTableRow,
};
