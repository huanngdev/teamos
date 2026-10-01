import { createDatabase, type Database } from "@teamos/db";
import { member, organization } from "@teamos/db/schema";
import { parseOrganizationRole, type OrganizationRole } from "@teamos/shared";
import { and, eq } from "drizzle-orm";

interface SeedOrganization {
  createdAt: Date;
  logo: string | null;
  memberId: string;
  name: string;
  organizationId: string;
  role: OrganizationRole;
  slug: string;
}

interface SeedContext {
  close: () => Promise<void>;
  db: Database;
  organization: SeedOrganization;
  projectId: string;
}

async function openSeedContext(): Promise<SeedContext> {
  if (process.env.SEED !== "true" && process.env.SEED_ISSUES !== "true") {
    console.error("Refusing to seed. Set SEED=true in apps/api/.env.");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl === undefined || databaseUrl.length === 0) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const organizationId = requiredEnv("SEED_ORGANIZATION_ID");
  const projectId = requiredEnv("SEED_PROJECT_ID");
  const actorMemberId = requiredEnv("SEED_ACTOR_MEMBER_ID");
  const client = createDatabase({ connectionString: databaseUrl });
  const [actor] = await client.db
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
    .where(and(eq(member.id, actorMemberId), eq(member.organizationId, organizationId)))
    .limit(1);

  if (actor === undefined) {
    await client.close();
    throw new Error("SEED_ACTOR_MEMBER_ID is not a member of SEED_ORGANIZATION_ID.");
  }

  const role = parseOrganizationRole(actor.role);

  if (role === null) {
    await client.close();
    throw new Error("The actor member has an unknown organization role.");
  }

  return {
    close: () => client.close(),
    db: client.db,
    organization: {
      createdAt: actor.createdAt,
      logo: actor.logo,
      memberId: actor.memberId,
      name: actor.name,
      organizationId: actor.organizationId,
      role,
      slug: actor.slug,
    },
    projectId,
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim() ?? "";

  if (value.length === 0) {
    console.error(`${name} is required.`);
    process.exit(1);
  }

  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim() ?? "";

  return value.length === 0 ? undefined : value;
}

export { openSeedContext, optionalEnv, requiredEnv, type SeedContext };
