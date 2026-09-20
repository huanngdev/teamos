import type { Database } from "@teamos/db";
import { member, user } from "@teamos/db/schema";
import { type OrganizationMember } from "@teamos/shared";
import { and, asc, count, eq, sql, type SQL } from "drizzle-orm";

import { toOrganizationMember } from "@/auth/mappers.js";
import { buildLiteralSearchCondition } from "@/services/search.js";

interface ListMembersInput {
  limit: number;
  offset: number;
  organizationId: string;
  search: string | undefined;
}

interface ListMembersResult {
  members: OrganizationMember[];
  total: number;
}

interface OrganizationMemberService {
  count: (organizationId: string) => Promise<number>;
  findMember: (input: {
    memberId: string;
    organizationId: string;
  }) => Promise<OrganizationMember | undefined>;
  list: (input: ListMembersInput) => Promise<ListMembersResult>;
}

function createOrganizationMemberService(db: Database): OrganizationMemberService {
  function buildSearchCondition(search: string | undefined): SQL | undefined {
    return buildLiteralSearchCondition([user.name, user.email], search);
  }

  const selection = {
    email: user.email,
    id: member.id,
    image: user.image,
    name: user.name,
    role: member.role,
    userId: user.id,
  };

  return {
    count: async (organizationId) => {
      const [record] = await db
        .select({ value: count() })
        .from(member)
        .where(eq(member.organizationId, organizationId));

      return record?.value ?? 0;
    },
    findMember: async ({ memberId, organizationId }) => {
      const [record] = await db
        .select(selection)
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(and(eq(member.organizationId, organizationId), eq(member.id, memberId)))
        .limit(1);

      return record === undefined ? undefined : toOrganizationMember(record);
    },
    list: async ({ limit, offset, organizationId, search }) => {
      const where = and(eq(member.organizationId, organizationId), buildSearchCondition(search));

      const [records, [totalRecord]] = await Promise.all([
        db
          .select(selection)
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(where)
          .orderBy(asc(sql`lower(${user.name})`), asc(member.id))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(where),
      ]);

      return {
        members: records.map(toOrganizationMember),
        total: totalRecord?.value ?? 0,
      };
    },
  };
}

export {
  createOrganizationMemberService,
  type ListMembersInput,
  type ListMembersResult,
  type OrganizationMemberService,
};
