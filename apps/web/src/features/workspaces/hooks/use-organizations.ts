import { useQuery } from "@tanstack/react-query";

import { useShellStore } from "@/shared";
import { listOrganizations } from "../api/organization-api";

import { ORGANIZATIONS_QUERY_KEY } from "../query-keys";

function useOrganizations(options: { enabled?: boolean } = {}) {
  const cached = useShellStore((state) => state.organizations);
  const setOrganizations = useShellStore((state) => state.setOrganizations);
  const query = useQuery({
    enabled: (options.enabled ?? true) && cached === null,
    queryFn: async () => {
      const organizations = await listOrganizations();
      setOrganizations(organizations);

      return organizations;
    },
    queryKey: ORGANIZATIONS_QUERY_KEY,
  });

  return {
    errorMessage: query.isError && cached === null ? "Your workspaces could not be loaded." : null,
    isPending: cached === null && query.isPending,
    organizations: cached ?? query.data ?? [],
    retry: () => {
      void query.refetch();
    },
  };
}

export { useOrganizations };
