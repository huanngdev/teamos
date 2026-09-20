import type { OrganizationAccess, OrganizationAccessService } from "@/auth/index.js";
import { AppError } from "@/errors/index.js";

/*
 * Resolves the caller's membership for an organization path segment. Callers
 * are already authenticated by the route middleware, so a missing membership is
 * reported as not found to avoid confirming that the workspace exists.
 */
async function requireOrganizationAccess(
  organizationAccess: OrganizationAccessService,
  organizationSlug: string,
  userId: string,
): Promise<OrganizationAccess> {
  const organization = await organizationAccess.resolve({ organizationSlug, userId });

  if (organization === undefined) {
    throw new AppError(404, "ORGANIZATION_NOT_FOUND", "The organization was not found.");
  }

  return organization;
}

export { requireOrganizationAccess };
