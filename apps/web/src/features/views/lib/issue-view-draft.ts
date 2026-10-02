import {
  isCalendarDateKey,
  issueViewDefinitionFromFilters,
  issueViewDefinitionsEqual,
  issueViewToListQuery,
  parseIssueListQuery,
  type IssueListQuery,
  type IssueViewDefinition,
  type IssueViewFilters,
} from "@teamos/shared";

const issueViewDraftParam = "draft";

const issueViewQueryKeys = [
  "assignee",
  "category",
  "created",
  "description",
  "number",
  "priority",
  "q",
  "status",
  "timeZone",
  "title",
  "updated",
] as const;

function browserTimeZone(): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return timeZone.length > 0 ? timeZone : "UTC";
}

function serializeIssueViewDraft(definition: IssueViewDefinition): string {
  const params = new URLSearchParams();
  const query = issueViewToListQuery(definition);
  params.set(issueViewDraftParam, "1");

  for (const key of issueViewQueryKeys) {
    const value = query[key];

    if (value !== undefined) {
      params.set(key, value);
    }
  }

  return params.toString();
}

function queryValue(
  params: URLSearchParams,
  key: (typeof issueViewQueryKeys)[number],
): string | undefined {
  return params.get(key) ?? undefined;
}

function sameIssueListQuery(left: IssueListQuery, right: IssueListQuery): boolean {
  return issueViewQueryKeys.every((key) => (left[key] ?? "") === (right[key] ?? ""));
}

function parseIssueViewDraft(
  search: string,
  fallbackTimeZone: string,
):
  | { definition: IssueViewDefinition; status: "draft" }
  | { status: "invalid" }
  | { status: "saved" } {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  if (params.get(issueViewDraftParam) !== "1") {
    return { status: "saved" };
  }

  const query: IssueListQuery = {
    assignee: queryValue(params, "assignee"),
    category: queryValue(params, "category"),
    created: queryValue(params, "created"),
    description: queryValue(params, "description"),
    number: queryValue(params, "number"),
    priority: queryValue(params, "priority"),
    q: queryValue(params, "q"),
    status: queryValue(params, "status"),
    timeZone: queryValue(params, "timeZone") ?? fallbackTimeZone,
    title: queryValue(params, "title"),
    updated: queryValue(params, "updated"),
  };
  const filters = parseIssueListQuery(query);

  if (filters.unsatisfiable) {
    return { status: "invalid" };
  }

  try {
    const definition = issueViewDefinitionFromFilters(filters);

    if (!sameIssueListQuery(query, issueViewToListQuery(definition))) {
      return { status: "invalid" };
    }

    return { definition, status: "draft" };
  } catch {
    return { status: "invalid" };
  }
}

function toggleFilterValue<T extends string>(
  values: readonly T[] | undefined,
  value: T,
): T[] | undefined {
  const current = values ?? [];
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];

  return next.length === 0 ? undefined : next;
}

function toggleAssignee(filters: IssueViewFilters, token: string): IssueViewFilters {
  const current = filters.assignee ?? {
    includeCurrentUser: false,
    includeUnassigned: false,
    memberIds: [],
  };
  const next =
    token === "me"
      ? { ...current, includeCurrentUser: !current.includeCurrentUser }
      : token === "unassigned"
        ? { ...current, includeUnassigned: !current.includeUnassigned }
        : {
            ...current,
            memberIds: current.memberIds.includes(token)
              ? current.memberIds.filter((memberId) => memberId !== token)
              : [...current.memberIds, token],
          };
  const assignee =
    next.includeCurrentUser || next.includeUnassigned || next.memberIds.length > 0
      ? next
      : undefined;

  return { ...filters, assignee };
}

function setFilterText(
  filters: IssueViewFilters,
  field: "description" | "q" | "title",
  value: string,
): IssueViewFilters {
  const trimmed = value.trim();

  return { ...filters, [field]: trimmed.length === 0 ? undefined : trimmed };
}

function setFilterNumber(
  filters: IssueViewFilters,
  bound: "max" | "min",
  value: string,
): IssueViewFilters {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return bound === "min"
      ? { ...filters, numberMin: undefined }
      : { ...filters, numberMax: undefined };
  }

  if (!/^\d+$/.test(trimmed)) {
    return filters;
  }

  const parsed = Number(trimmed);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return filters;
  }

  return bound === "min" ? { ...filters, numberMin: parsed } : { ...filters, numberMax: parsed };
}

function setFilterDate(
  filters: IssueViewFilters,
  field: "createdFrom" | "createdTo" | "updatedFrom" | "updatedTo",
  value: string,
): IssueViewFilters {
  if (value.length > 0 && !isCalendarDateKey(value)) {
    return filters;
  }

  return { ...filters, [field]: value.length === 0 ? undefined : value };
}

function issueViewListParams(definition: IssueViewDefinition): Record<string, string> {
  const query = issueViewToListQuery(definition);

  return Object.fromEntries(
    issueViewQueryKeys.flatMap((key) => {
      const value = query[key];

      return value === undefined ? [] : [[key, value]];
    }),
  );
}

function countAdvancedIssueViewFilters(filters: IssueViewFilters): number {
  const values = [
    filters.q,
    filters.title,
    filters.description,
    filters.numberMin,
    filters.numberMax,
    filters.createdFrom,
    filters.createdTo,
    filters.updatedFrom,
    filters.updatedTo,
  ];

  return values.filter((value) => value !== undefined && String(value).length > 0).length;
}

function selectedAssigneeIds(filters: IssueViewFilters): string[] {
  const assignee = filters.assignee;

  if (assignee === undefined) {
    return [];
  }

  return [
    ...(assignee.includeCurrentUser ? ["me"] : []),
    ...(assignee.includeUnassigned ? ["unassigned"] : []),
    ...assignee.memberIds,
  ];
}

export {
  browserTimeZone,
  countAdvancedIssueViewFilters,
  issueViewDefinitionsEqual,
  issueViewListParams,
  parseIssueViewDraft,
  selectedAssigneeIds,
  serializeIssueViewDraft,
  setFilterDate,
  setFilterNumber,
  setFilterText,
  toggleAssignee,
  toggleFilterValue,
};
