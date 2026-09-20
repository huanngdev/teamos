import { MockLogLayer } from "loglayer";
import type { AssignableOrganizationRole, OrganizationMember } from "@teamos/shared";

import type {
  AuthService,
  AuthSession,
  OrganizationAccess,
  OrganizationAccessService,
  OrganizationGateway,
} from "@/auth/index.js";
import type {
  OrganizationManagementService,
  OrganizationMemberService,
  ProjectService,
} from "@/services/index.js";
import type { ProjectSummary } from "@teamos/shared";

interface OrganizationAccessOverrides {
  createdAt?: Date;
  logo?: string | null;
  memberId?: string;
  name?: string;
  organizationId?: string;
  role?: OrganizationAccess["role"];
  slug?: string;
}

function buildOrganizationAccess(overrides: OrganizationAccessOverrides = {}): OrganizationAccess {
  return {
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
    logo: overrides.logo ?? null,
    memberId: overrides.memberId ?? "member-1",
    name: overrides.name ?? "Analytical Engines",
    organizationId: overrides.organizationId ?? "org-1",
    role: overrides.role ?? "owner",
    slug: overrides.slug ?? "analytical-engines",
  };
}

function buildSession(overrides: { emailVerified?: boolean; userId?: string } = {}): AuthSession {
  const userId = overrides.userId ?? "user-1";

  return {
    session: {
      activeOrganizationId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
      id: "session-1",
      ipAddress: null,
      token: "session-token",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      userAgent: null,
      userId,
    },
    user: {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      email: `user-${userId}@example.com`,
      emailVerified: overrides.emailVerified ?? true,
      id: userId,
      image: null,
      name: `User ${userId}`,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  };
}

function createFakeAuthService(session: AuthSession | null): AuthService {
  return {
    getSession: async () => session,
    handler: async () => new Response("auth-handler", { status: 200 }),
  };
}

function createFakeOrganizationAccessService(
  organizations: readonly OrganizationAccess[],
): OrganizationAccessService {
  return {
    resolve: async ({ organizationSlug }) =>
      organizations.find((organization) => organization.slug === organizationSlug),
  };
}

interface FakeOrganizationMemberService extends OrganizationMemberService {
  readonly calls: {
    count: string[];
    findMember: { memberId: string; organizationId: string }[];
    list: { limit: number; offset: number; organizationId: string; search: string | undefined }[];
  };
}

function createFakeOrganizationMemberService(
  members: readonly OrganizationMember[] = [],
): FakeOrganizationMemberService {
  const calls: FakeOrganizationMemberService["calls"] = { count: [], findMember: [], list: [] };

  return {
    calls,
    count: async (organizationId) => {
      calls.count.push(organizationId);

      return members.length;
    },
    findMember: async (input) => {
      calls.findMember.push(input);

      return members.find((member) => member.id === input.memberId);
    },
    list: async (input) => {
      calls.list.push(input);

      const search = input.search?.toLowerCase();
      const matched =
        search === undefined || search.length === 0
          ? members
          : members.filter(
              (member) =>
                member.name.toLowerCase().includes(search) ||
                member.email.toLowerCase().includes(search),
            );

      return {
        members: matched.slice(input.offset, input.offset + input.limit),
        total: matched.length,
      };
    },
  };
}

function createFakeOrganizationGateway(): OrganizationGateway {
  return {
    cancelInvitation: async () => {},
    createInvitation: async ({ email, role }) => ({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      email,
      expiresAt: new Date("2026-01-03T00:00:00.000Z"),
      id: "invitation-1",
      inviterId: "user-1",
      organizationId: "org-1",
      role,
      status: "pending",
    }),
    deleteOrganization: async () => {},
    listInvitations: async () => [],
    removeMember: async () => {},
    updateMemberRole: async () => {},
    updateOrganization: async ({ name, organizationId }) => ({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: organizationId,
      logo: null,
      name,
      slug: "analytical-engines",
    }),
  };
}

function createFakeOrganizationManagementService(): OrganizationManagementService {
  return {
    cancelInvitation: async () => {},
    createInvitation: async ({ request }) => ({
      createdAt: "2026-01-01T00:00:00.000Z",
      email: request.email,
      expiresAt: "2026-01-03T00:00:00.000Z",
      id: "invitation-1",
      inviterId: "user-1",
      role: request.role satisfies AssignableOrganizationRole,
      status: "pending" as const,
    }),
    deleteOrganization: async () => {},
    listPendingInvitations: async () => [],
    removeMember: async () => {},
    resendInvitation: async () => ({
      createdAt: "2026-01-01T00:00:00.000Z",
      email: "ada@example.com",
      expiresAt: "2026-01-03T00:00:00.000Z",
      id: "invitation-2",
      inviterId: "user-1",
      role: "member" as const,
      status: "pending" as const,
    }),
    updateMemberRole: async () => {},
    updateOrganization: async ({ organization, request }) => ({
      createdAt: organization.createdAt.toISOString(),
      id: organization.organizationId,
      logo: organization.logo,
      name: request.name,
      slug: organization.slug,
    }),
  };
}

function createFakeProjectService(projects: readonly ProjectSummary[] = []): ProjectService {
  return {
    create: async ({ request }) => ({
      createdAt: "2026-01-01T00:00:00.000Z",
      description: request.description ?? null,
      id: "project-1",
      memberCount: 1,
      name: request.name,
      role: "lead",
      slug: request.slug,
      updatedAt: "2026-01-01T00:00:00.000Z",
      visibility: request.visibility,
    }),
    list: async ({ search }) => {
      const matched =
        search === undefined || search.length === 0
          ? projects
          : projects.filter((project) => project.name.toLowerCase().includes(search.toLowerCase()));

      return [...matched];
    },
    listMembers: async () => [],
    remove: async () => {},
    removeMember: async () => {},
    setMember: async () => {},
    update: async ({ projectId, request }) => {
      const existing = projects.find((project) => project.id === projectId);

      if (existing === undefined) {
        throw new Error("Project not found in fake service.");
      }

      return {
        ...existing,
        ...(request.description === undefined ? {} : { description: request.description }),
        ...(request.name === undefined ? {} : { name: request.name }),
        ...(request.visibility === undefined ? {} : { visibility: request.visibility }),
      };
    },
  };
}

function createTestLogger(): MockLogLayer {
  return new MockLogLayer();
}

export {
  buildOrganizationAccess,
  buildSession,
  createFakeAuthService,
  createFakeOrganizationAccessService,
  createFakeOrganizationGateway,
  createFakeOrganizationManagementService,
  createFakeOrganizationMemberService,
  createFakeProjectService,
  createTestLogger,
  type FakeOrganizationMemberService,
};
