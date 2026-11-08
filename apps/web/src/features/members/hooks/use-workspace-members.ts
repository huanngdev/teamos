import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MemberListResponse } from "@teamos/shared";

import { listOrganizationMembers } from "../api/organization-members-api";
import { memberKeys } from "../query-keys";
import { workspaceKeys } from "@/features/workspaces";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

const MEMBERS_PAGE_SIZE = 25;
const MEMBERS_SEARCH_DEBOUNCE_MS = 300;

interface UseWorkspaceMembersOptions {
  enabled: boolean;
  organizationSlug: string;
}

interface WorkspaceMembersState {
  errorMessage: string | null;
  isFetching: boolean;
  isPending: boolean;
  members: MemberListResponse["members"];
  page: number;
  pageCount: number;
  retry: () => void;
  searchInput: string;
  searchIsSettling: boolean;
  setPage: (page: number) => void;
  setSearchInput: (value: string) => void;
  total: number;
}

function useWorkspaceMembers(options: UseWorkspaceMembersOptions): WorkspaceMembersState {
  const [searchInput, setSearchInput] = useState("");
  const [pageState, setPageState] = useState({ page: 0, search: "" });
  const search = searchInput.trim();
  const debouncedSearch = useDebouncedValue(search, MEMBERS_SEARCH_DEBOUNCE_MS);

  /*
   * A new search term restarts pagination. Deriving the page from the debounced
   * search avoids an effect that would reset state after the query already ran.
   */
  const page = pageState.search === debouncedSearch ? pageState.page : 0;

  const query = useQuery({
    enabled: options.enabled,
    placeholderData: keepPreviousData,
    queryFn: () =>
      listOrganizationMembers(options.organizationSlug, {
        limit: MEMBERS_PAGE_SIZE,
        offset: page * MEMBERS_PAGE_SIZE,
        search: debouncedSearch.length === 0 ? undefined : debouncedSearch,
      }),
    queryKey: memberKeys(options.organizationSlug).list(debouncedSearch, page * MEMBERS_PAGE_SIZE),
  });

  const members = query.data?.members ?? [];
  const total = query.data?.pagination.total ?? 0;

  return {
    errorMessage: query.isError ? "The member list could not be loaded." : null,
    isFetching: query.isFetching,
    isPending: query.isPending,
    members,
    page,
    pageCount: Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE)),
    retry: () => {
      void query.refetch();
    },
    searchInput,
    searchIsSettling: search !== debouncedSearch,
    setPage: (next) => {
      setPageState({ page: next, search: debouncedSearch });
    },
    setSearchInput,
    total,
  };
}

/*
 * Member mutations change the workspace member count as well, so both the
 * workspace context and every member page are invalidated together.
 */
function useWorkspaceMembersInvalidator(organizationSlug: string): () => Promise<void> {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: workspaceKeys(organizationSlug).detail(),
      }),
      queryClient.invalidateQueries({
        queryKey: ["organization", organizationSlug, "members"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["organization", organizationSlug, "assignees"],
      }),
    ]);
  };
}

export {
  MEMBERS_PAGE_SIZE,
  MEMBERS_SEARCH_DEBOUNCE_MS,
  useWorkspaceMembers,
  useWorkspaceMembersInvalidator,
  type WorkspaceMembersState,
};
