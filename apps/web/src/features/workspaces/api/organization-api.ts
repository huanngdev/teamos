import {
  organizationContextResponseSchema,
  type DeleteOrganizationRequest,
  type OrganizationContext,
  type OrganizationSummary,
  type UpdateOrganizationRequest,
} from "@teamos/shared";

import { authClient } from "@/features/auth";
import { requestParsed, requestVoid } from "@/shared/api/api-client";

async function getOrganizationContext(organizationSlug: string): Promise<OrganizationContext> {
  const response = await requestParsed(organizationContextResponseSchema, {
    method: "GET",
    url: `/api/organizations/${encodeURIComponent(organizationSlug)}`,
  });

  return response.organization;
}

/*
 * Rename and deletion go through the TeamOS facade, never the Better Auth
 * client, so authorization, auditing, and the typed confirmation stay in one
 * server-side path.
 */
async function updateOrganization(
  organizationSlug: string,
  request: UpdateOrganizationRequest,
): Promise<OrganizationContext> {
  const response = await requestParsed(organizationContextResponseSchema, {
    data: request,
    method: "PATCH",
    url: `/api/organizations/${encodeURIComponent(organizationSlug)}`,
  });

  return response.organization;
}

async function deleteOrganization(
  organizationSlug: string,
  request: DeleteOrganizationRequest,
): Promise<void> {
  await requestVoid({
    data: request,
    method: "DELETE",
    url: `/api/organizations/${encodeURIComponent(organizationSlug)}`,
  });
}

/*
 * Better Auth returns the organization `createdAt` as a `Date` over its typed
 * client and as an ISO string in raw JSON. Normalizing through `Date` keeps the
 * summary valid for both without trusting the transport.
 */
function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function listOrganizations(): Promise<OrganizationSummary[]> {
  const { data, error } = await authClient.organization.list();

  if (error) {
    throw new Error(error.message ?? "Unable to load workspaces.");
  }

  return (data ?? []).map((organization) => ({
    createdAt: toIsoString(organization.createdAt),
    id: organization.id,
    logo: organization.logo ?? null,
    name: organization.name,
    slug: organization.slug,
  }));
}

export { deleteOrganization, getOrganizationContext, listOrganizations, updateOrganization };
