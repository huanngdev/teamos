import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { EligibleAssignee } from "@teamos/shared";

import { useDebouncedValue } from "@/shared";
import { listEligibleAssignees } from "../api/project-api";
import { projectKeys } from "../query-keys";

const ASSIGNEE_PAGE_SIZE = 25;
const ASSIGNEE_SEARCH_DEBOUNCE_MS = 300;

interface EligibleAssigneePicker {
  assignees: EligibleAssignee[];
  error: string | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onSearch: (value: string) => void;
  search: string;
}

function useEligibleAssignees(options: {
  enabled: boolean;
  organizationSlug: string;
  projectId: string | null;
}): EligibleAssigneePicker {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, ASSIGNEE_SEARCH_DEBOUNCE_MS);
  const projectId = options.projectId;
  const ready = options.enabled && projectId !== null;
  const pages = useInfiniteQuery({
    queryKey:
      projectId === null
        ? ["assignees", "pending", debouncedSearch]
        : projectKeys(options.organizationSlug).assignees(projectId, debouncedSearch),
    queryFn: ({ pageParam }) =>
      listEligibleAssignees(options.organizationSlug, projectId ?? "", {
        ...(pageParam === undefined ? {} : { cursor: pageParam }),
        limit: ASSIGNEE_PAGE_SIZE,
        ...(debouncedSearch.length === 0 ? {} : { q: debouncedSearch }),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: { nextCursor: string | null }) => lastPage.nextCursor ?? undefined,
    enabled: ready,
  });
  const seen = new Set<string>();
  const assignees = (pages.data?.pages ?? []).flatMap((page) =>
    page.assignees.filter((assignee) => {
      if (seen.has(assignee.id)) {
        return false;
      }

      seen.add(assignee.id);

      return true;
    }),
  );

  return {
    assignees,
    error: pages.isError ? "Assignees could not be loaded." : null,
    hasMore: pages.hasNextPage,
    loading: ready && pages.isPending,
    loadingMore: pages.isFetchingNextPage,
    onLoadMore: () => {
      if (pages.hasNextPage && !pages.isFetchingNextPage) {
        void pages.fetchNextPage();
      }
    },
    onRetry: () => {
      void pages.refetch();
    },
    onSearch: setSearch,
    search,
  };
}

function useEligibleAssigneeLookup(options: {
  enabled: boolean;
  ids: readonly string[];
  organizationSlug: string;
  projectId: string | null;
}) {
  const projectId = options.projectId;
  const ids = [...new Set(options.ids)].sort();
  const key = ids.join(",");

  return useQuery({
    enabled: options.enabled && projectId !== null && ids.length > 0,
    queryFn: () =>
      listEligibleAssignees(options.organizationSlug, projectId ?? "", {
        ids: key,
      }),
    queryKey:
      projectId === null
        ? ["assignees", "lookup", "pending", key]
        : projectKeys(options.organizationSlug).assignees(projectId, `ids:${key}`),
  });
}

export { useEligibleAssigneeLookup, useEligibleAssignees, type EligibleAssigneePicker };
