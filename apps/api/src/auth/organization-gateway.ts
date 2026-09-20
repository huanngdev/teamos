import type { AssignableOrganizationRole } from "@teamos/shared";

import type { Auth } from "./auth.js";

/*
 * A narrow server-side view of the Better Auth organization API. TeamOS routes
 * always pass the caller's headers so Better Auth keeps enforcing its own
 * permission checks on top of the TeamOS policy checks, and so tests can fake
 * this boundary without constructing a full auth instance.
 */
interface InvitationRecord {
  createdAt: Date;
  email: string;
  expiresAt: Date;
  id: string;
  inviterId: string;
  organizationId: string;
  role: string;
  status: string;
}

interface OrganizationRecord {
  createdAt: Date;
  id: string;
  logo: string | null;
  name: string;
  slug: string;
}

interface OrganizationGateway {
  cancelInvitation: (input: { headers: Headers; invitationId: string }) => Promise<void>;
  createInvitation: (input: {
    email: string;
    headers: Headers;
    organizationId: string;
    role: AssignableOrganizationRole;
  }) => Promise<InvitationRecord>;
  deleteOrganization: (input: { headers: Headers; organizationId: string }) => Promise<void>;
  listInvitations: (input: {
    headers: Headers;
    organizationId: string;
  }) => Promise<InvitationRecord[]>;
  removeMember: (input: {
    headers: Headers;
    memberIdOrEmail: string;
    organizationId: string;
  }) => Promise<void>;
  updateMemberRole: (input: {
    headers: Headers;
    memberId: string;
    organizationId: string;
    role: AssignableOrganizationRole;
  }) => Promise<void>;
  updateOrganization: (input: {
    headers: Headers;
    name: string;
    organizationId: string;
  }) => Promise<OrganizationRecord>;
}

function createOrganizationGateway(auth: Auth): OrganizationGateway {
  return {
    cancelInvitation: async ({ headers, invitationId }) => {
      await auth.api.cancelInvitation({
        body: { invitationId },
        headers,
      });
    },
    createInvitation: async ({ email, headers, organizationId, role }) => {
      return auth.api.createInvitation({
        body: { email, organizationId, role },
        headers,
      });
    },
    deleteOrganization: async ({ headers, organizationId }) => {
      await auth.api.deleteOrganization({
        body: { organizationId },
        headers,
      });
    },
    listInvitations: async ({ headers, organizationId }) => {
      return auth.api.listInvitations({
        headers,
        query: { organizationId },
      });
    },
    removeMember: async ({ headers, memberIdOrEmail, organizationId }) => {
      await auth.api.removeMember({
        body: { memberIdOrEmail, organizationId },
        headers,
      });
    },
    updateMemberRole: async ({ headers, memberId, organizationId, role }) => {
      await auth.api.updateMemberRole({
        body: { memberId, organizationId, role },
        headers,
      });
    },
    updateOrganization: async ({ headers, name, organizationId }) => {
      const updated = await auth.api.updateOrganization({
        body: { data: { name }, organizationId },
        headers,
      });

      if (updated === null) {
        throw new Error("Better Auth returned no organization after update.");
      }

      return {
        createdAt: updated.createdAt,
        id: updated.id,
        logo: updated.logo ?? null,
        name: updated.name,
        slug: updated.slug,
      };
    },
  };
}

export {
  createOrganizationGateway,
  type InvitationRecord,
  type OrganizationGateway,
  type OrganizationRecord,
};
