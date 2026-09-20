import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectSummary } from "@teamos/shared";
import { useState } from "react";

import { listProjects } from "../api/project-api";
import { projectKeys } from "../query-keys";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

const PROJECTS_SEARCH_DEBOUNCE_MS = 300;

interface ProjectSearchState {
  debouncedSearch: string;
  isSettling: boolean;
  searchInput: string;
  setSearchInput: (value: string) => void;
}

function useProjectSearch(): ProjectSearchState {
  const [searchInput, setSearchInput] = useState("");
  const search = searchInput.trim();
  const debouncedSearch = useDebouncedValue(search, PROJECTS_SEARCH_DEBOUNCE_MS);

  return {
    debouncedSearch,
    isSettling: search !== debouncedSearch,
    searchInput,
    setSearchInput,
  };
}

interface UseProjectListOptions {
  enabled?: boolean;
  organizationSlug: string;
  search?: string;
}

interface ProjectListState {
  errorMessage: string | null;
  isFetching: boolean;
  isPending: boolean;
  projects: ProjectSummary[];
  retry: () => void;
}

/*
 * The unfiltered list key and a filtered list share one cache entry per search
 * term, so the workspace tab count can observe the unfiltered list without an
 * extra request when no search is active.
 */
function useProjectList(options: UseProjectListOptions): ProjectListState {
  const search = options.search ?? "";

  const query = useQuery({
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    queryFn: () =>
      listProjects(options.organizationSlug, {
        search: search.length === 0 ? undefined : search,
      }),
    queryKey: projectKeys(options.organizationSlug).list(search),
  });

  return {
    errorMessage: query.isError ? "Projects could not be loaded." : null,
    isFetching: query.isFetching,
    isPending: query.isPending,
    projects: query.data ?? [],
    retry: () => {
      void query.refetch();
    },
  };
}

function useProjectListInvalidator(organizationSlug: string): () => Promise<void> {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({
      queryKey: projectKeys(organizationSlug).listPrefix(),
    });
  };
}

export {
  useProjectList,
  useProjectListInvalidator,
  useProjectSearch,
  type ProjectListState,
  type ProjectSearchState,
};
