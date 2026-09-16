import {
  organizationContextResponseSchema,
  type OrganizationContext,
  type OrganizationSummary,
} from "@teamos/shared";

import { ApiClientError, apiClient, toApiClientError } from "./api-client";
import { authClient } from "./auth-client";

async function getOrganizationContext(organizationSlug: string): Promise<OrganizationContext> {
  try {
    const response = await apiClient.get<unknown>(
      `/api/organizations/${encodeURIComponent(organizationSlug)}`,
    );
    const parsed = organizationContextResponseSchema.safeParse(response.data);

    if (!parsed.success) {
      throw new ApiClientError("The API returned an invalid organization response.", {
        kind: "invalid-response",
        status: response.status,
      });
    }

    return parsed.data.organization;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw toApiClientError(error);
  }
}

async function listOrganizations(): Promise<OrganizationSummary[]> {
  const { data, error } = await authClient.organization.list();

  if (error) {
    throw new Error(error.message ?? "Unable to load workspaces.");
  }

  return (data ?? []).map((organization) => ({
    id: organization.id,
    logo: organization.logo ?? null,
    name: organization.name,
    slug: organization.slug,
  }));
}

export { getOrganizationContext, listOrganizations };
