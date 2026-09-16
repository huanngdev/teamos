import { useQuery } from "@tanstack/react-query";
import type { OrganizationContext } from "@teamos/shared";

import { ApiClientError } from "@/lib/api-client";
import { getOrganizationContext } from "@/lib/organization-api";

type WorkspaceState =
  | { status: "loading" }
  | { organization: OrganizationContext; status: "ready" }
  | { status: "not-found" }
  | { message: string; status: "error" };

function useWorkspace(organizationSlug: string): WorkspaceState {
  const query = useQuery({
    queryFn: () => getOrganizationContext(organizationSlug),
    queryKey: ["organization", organizationSlug],
    retry: (failureCount, error) =>
      !(error instanceof ApiClientError && error.status === 404) && failureCount < 1,
  });

  if (query.isPending) {
    return { status: "loading" };
  }

  if (query.isSuccess) {
    return { organization: query.data, status: "ready" };
  }

  if (query.error instanceof ApiClientError && query.error.status === 404) {
    return { status: "not-found" };
  }

  return { message: "The workspace could not be loaded.", status: "error" };
}

export { useWorkspace, type WorkspaceState };
