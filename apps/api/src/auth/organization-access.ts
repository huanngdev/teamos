import type { Database } from "@teamos/db";
import { member, organization } from "@teamos/db/schema";
import { parseOrganizationRole, type OrganizationRole } from "@teamos/shared";
import { and, eq } from "drizzle-orm";

interface ResolveOrganizationInput {
  organizationSlug: string;
  userId: string;
}

/*
 * A lightweight tenant guard. It resolves the caller's membership once and
 * exposes only identifiers and the organization role, so it stays cheap enough
 * to run before every tenant-scoped operation. Member listing is a separate
 * service because it is paginated and only needed by its own endpoints.
 */
interface OrganizationAccess {
  createdAt: Date;
  logo: string | null;
  memberId: string;
  name: string;
  organizationId: string;
  role: OrganizationRole;
  slug: string;
}

interface OrganizationAccessService {
  resolve: (input: ResolveOrganizationInput) => Promise<OrganizationAccess | undefined>;
}

function createOrganizationAccessService(db: Database): OrganizationAccessService {
  return {
    resolve: async ({ organizationSlug, userId }) => {
      const [membership] = await db
        .select({
          createdAt: organization.createdAt,
          logo: organization.logo,
          memberId: member.id,
          name: organization.name,
          organizationId: organization.id,
          role: member.role,
          slug: organization.slug,
        })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(and(eq(member.userId, userId), eq(organization.slug, organizationSlug)))
        .limit(1);

      if (membership === undefined) {
        return undefined;
      }

      return {
        createdAt: membership.createdAt,
        logo: membership.logo,
        memberId: membership.memberId,
        name: membership.name,
        organizationId: membership.organizationId,
        role: parseOrganizationRole(membership.role) ?? "member",
        slug: membership.slug,
      };
    },
  };
}

export {
  createOrganizationAccessService,
  type OrganizationAccess,
  type OrganizationAccessService,
  type ResolveOrganizationInput,
};
