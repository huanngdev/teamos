import { useQuery } from "@tanstack/react-query";

import { listOrganizations } from "@/lib/organization-api";

const ORGANIZATIONS_QUERY_KEY = ["organizations"] as const;

function useOrganizations(options: { enabled?: boolean } = {}) {
  const query = useQuery({
    enabled: options.enabled ?? true,
    queryFn: listOrganizations,
    queryKey: ORGANIZATIONS_QUERY_KEY,
  });

  return {
    errorMessage: query.isError ? "Your workspaces could not be loaded." : null,
    isPending: query.isPending,
    organizations: query.data ?? [],
    retry: () => {
      void query.refetch();
    },
  };
}

export { ORGANIZATIONS_QUERY_KEY, useOrganizations };
