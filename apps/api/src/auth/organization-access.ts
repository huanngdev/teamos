import type { Database } from "@teamos/db";
import { member, organization, user } from "@teamos/db/schema";
import { parseOrganizationRole, type OrganizationContext } from "@teamos/shared";
import { and, eq } from "drizzle-orm";

import { toOrganizationMember } from "./mappers.js";

interface ResolveOrganizationInput {
  organizationSlug: string;
  userId: string;
}

interface OrganizationAccessService {
  resolve: (input: ResolveOrganizationInput) => Promise<OrganizationContext | undefined>;
}

function createOrganizationAccessService(db: Database): OrganizationAccessService {
  return {
    resolve: async ({ organizationSlug, userId }) => {
      const [membership] = await db
        .select({
          logo: organization.logo,
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

      const memberRecords = await db
        .select({
          email: user.email,
          id: member.id,
          image: user.image,
          name: user.name,
          role: member.role,
          userId: user.id,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(eq(member.organizationId, membership.organizationId));

      return {
        id: membership.organizationId,
        logo: membership.logo,
        members: memberRecords.map(toOrganizationMember),
        name: membership.name,
        role: parseOrganizationRole(membership.role) ?? "member",
        slug: membership.slug,
      };
    },
  };
}

export { createOrganizationAccessService, type OrganizationAccessService };
