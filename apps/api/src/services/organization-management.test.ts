import { MockLogLayer } from "loglayer";
import { describe, expect, test } from "bun:test";
import type { OrganizationMember } from "@teamos/shared";

import type { InvitationRecord, OrganizationAccess, OrganizationGateway } from "@/auth/index.js";
import { AppError } from "@/errors/index.js";
import {
  createOrganizationManagementService,
  type OrganizationManagementService,
} from "@/services/organization-management.js";

function buildAccess(overrides: Partial<OrganizationAccess> = {}): OrganizationAccess {
  return {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    logo: null,
    memberId: "member-owner",
    name: "Analytical Engines",
    organizationId: "org-1",
    role: "owner",
    slug: "analytical-engines",
    ...overrides,
  };
}

function buildInvitation(overrides: Partial<InvitationRecord> = {}): InvitationRecord {
  return {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    email: "invited@example.com",
    expiresAt: new Date("2030-01-03T00:00:00.000Z"),
    id: "invitation-1",
    inviterId: "user-1",
    organizationId: "org-1",
    role: "member",
    status: "pending",
    ...overrides,
  };
}

function buildBetterAuthError(code: string, statusCode = 400): Error {
  const error = new Error(code) as Error & { body: { code: string }; statusCode: number };

  error.body = { code };
  error.statusCode = statusCode;

  return error;
}

interface Harness {
  calls: {
    cancelled: string[];
    created: { email: string; role: string }[];
    removed: string[];
    roleUpdates: { memberId: string; role: string }[];
  };
  gateway: OrganizationGateway;
  service: OrganizationManagementService;
}

function createHarness(
  options: {
    members?: readonly OrganizationMember[];
    onCreateInvitationError?: unknown;
    onListInvitationsError?: unknown;
    pendingInvitations?: readonly InvitationRecord[];
  } = {},
): Harness {
  const members = options.members ?? [];
  const calls: Harness["calls"] = { cancelled: [], created: [], removed: [], roleUpdates: [] };

  const gateway: OrganizationGateway = {
    cancelInvitation: async ({ invitationId }) => {
      calls.cancelled.push(invitationId);
    },
    createInvitation: async ({ email, role }) => {
      if (options.onCreateInvitationError !== undefined) {
        throw options.onCreateInvitationError;
      }

      calls.created.push({ email, role });

      return buildInvitation({ email, id: `invitation-${calls.created.length}`, role });
    },
    listInvitations: async () => {
      if (options.onListInvitationsError !== undefined) {
        throw options.onListInvitationsError;
      }

      return [...(options.pendingInvitations ?? [])];
    },
    removeMember: async ({ memberIdOrEmail }) => {
      calls.removed.push(memberIdOrEmail);
    },
    updateMemberRole: async ({ memberId, role }) => {
      calls.roleUpdates.push({ memberId, role });
    },
  };

  const service = createOrganizationManagementService({
    gateway,
    logger: new MockLogLayer(),
    members: {
      findMember: async ({ memberId }) => members.find((member) => member.id === memberId),
    },
  });

  return { calls, gateway, service };
}

const plainMember: OrganizationMember = {
  email: "ada@example.com",
  id: "member-plain",
  image: null,
  name: "Ada Lovelace",
  role: "member",
  userId: "user-2",
};

const ownerMember: OrganizationMember = {
  email: "olivia@example.com",
  id: "member-owner",
  image: null,
  name: "Olivia Owner",
  role: "owner",
  userId: "user-3",
};

async function captureError(action: () => Promise<unknown>): Promise<AppError> {
  try {
    await action();
  } catch (error) {
    if (error instanceof AppError) {
      return error;
    }

    throw new Error(`Expected an AppError but received: ${String(error)}`);
  }

  throw new Error("Expected the action to fail.");
}

describe("invitation management", () => {
  test("only lets administrators see pending invitations", async () => {
    const { service } = createHarness();

    const error = await captureError(() =>
      service.listPendingInvitations({
        headers: new Headers(),
        organization: buildAccess({ role: "member" }),
      }),
    );

    expect(error.status).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  });

  test("hides expired and non-pending invitations", async () => {
    const { service } = createHarness({
      pendingInvitations: [
        buildInvitation({ id: "pending" }),
        buildInvitation({ expiresAt: new Date("2020-01-01T00:00:00.000Z"), id: "expired" }),
        buildInvitation({ id: "accepted", status: "accepted" }),
      ],
    });
    const invitations = await service.listPendingInvitations({
      headers: new Headers(),
      organization: buildAccess(),
    });

    expect(invitations.map((invitation) => invitation.id)).toEqual(["pending"]);
  });

  test("refuses to grant an owner role", async () => {
    const { calls, service } = createHarness();

    const error = await captureError(() =>
      service.createInvitation({
        headers: new Headers(),
        organization: buildAccess({ role: "owner" }),
        request: { email: "new@example.com", role: "owner" as never },
      }),
    );

    expect(error.status).toBe(403);
    expect(calls.created).toEqual([]);
  });

  test("maps an already-invited failure to a conflict code", async () => {
    const { service } = createHarness({
      onCreateInvitationError: buildBetterAuthError(
        "USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION",
        400,
      ),
    });

    const error = await captureError(() =>
      service.createInvitation({
        headers: new Headers(),
        organization: buildAccess(),
        request: { email: "new@example.com", role: "member" },
      }),
    );

    expect(error.status).toBe(409);
    expect(error.code).toBe("INVITATION_ALREADY_PENDING");
  });

  test("reports a delivery failure without leaking provider details", async () => {
    const { service } = createHarness({
      onCreateInvitationError: new Error("resend api key rejected: key_123"),
    });

    const error = await captureError(() =>
      service.createInvitation({
        headers: new Headers(),
        organization: buildAccess(),
        request: { email: "new@example.com", role: "member" },
      }),
    );

    expect(error.status).toBe(502);
    expect(error.code).toBe("INVITATION_EMAIL_FAILED");
    expect(error.message).not.toContain("key_123");
  });

  test("rotates the invitation id on resend", async () => {
    const { calls, service } = createHarness({
      pendingInvitations: [buildInvitation({ email: "invited@example.com", id: "old-invitation" })],
    });
    const invitation = await service.resendInvitation({
      headers: new Headers(),
      invitationId: "old-invitation",
      organization: buildAccess(),
    });

    expect(calls.created).toEqual([{ email: "invited@example.com", role: "member" }]);
    expect(invitation.id).not.toBe("old-invitation");
  });

  test("refuses to resend an invitation that is not pending", async () => {
    const { calls, service } = createHarness({
      pendingInvitations: [buildInvitation({ id: "done", status: "accepted" })],
    });

    const error = await captureError(() =>
      service.resendInvitation({
        headers: new Headers(),
        invitationId: "done",
        organization: buildAccess(),
      }),
    );

    expect(error.status).toBe(409);
    expect(calls.created).toEqual([]);
  });

  test("refuses to resend an unknown invitation", async () => {
    const { service } = createHarness();

    const error = await captureError(() =>
      service.resendInvitation({
        headers: new Headers(),
        invitationId: "missing",
        organization: buildAccess(),
      }),
    );

    expect(error.status).toBe(404);
    expect(error.code).toBe("INVITATION_NOT_FOUND");
  });
});

describe("member management", () => {
  test("does not let an administrator change an owner", async () => {
    const { calls, service } = createHarness({ members: [ownerMember] });

    const error = await captureError(() =>
      service.updateMemberRole({
        headers: new Headers(),
        memberId: "member-owner",
        organization: buildAccess({ role: "admin" }),
        role: "member",
      }),
    );

    expect(error.status).toBe(403);
    expect(calls.roleUpdates).toEqual([]);
  });

  test("does not let an ordinary member change a role", async () => {
    const { service } = createHarness({ members: [plainMember] });

    const error = await captureError(() =>
      service.updateMemberRole({
        headers: new Headers(),
        memberId: "member-plain",
        organization: buildAccess({ role: "member" }),
        role: "admin",
      }),
    );

    expect(error.status).toBe(403);
  });

  test("hides a target member that is not in the workspace", async () => {
    const { service } = createHarness({ members: [] });

    const error = await captureError(() =>
      service.updateMemberRole({
        headers: new Headers(),
        memberId: "member-from-another-workspace",
        organization: buildAccess(),
        role: "admin",
      }),
    );

    expect(error.status).toBe(404);
    expect(error.code).toBe("MEMBER_NOT_FOUND");
  });

  test("updates a role for an administrator", async () => {
    const { calls, service } = createHarness({ members: [plainMember] });

    await service.updateMemberRole({
      headers: new Headers(),
      memberId: "member-plain",
      organization: buildAccess(),
      role: "admin",
    });

    expect(calls.roleUpdates).toEqual([{ memberId: "member-plain", role: "admin" }]);
  });

  test("refuses to remove the acting user through a row action", async () => {
    const { calls, service } = createHarness({ members: [plainMember] });

    const error = await captureError(() =>
      service.removeMember({
        actorUserId: "user-2",
        headers: new Headers(),
        memberId: "member-plain",
        organization: buildAccess(),
      }),
    );

    expect(error.status).toBe(400);
    expect(calls.removed).toEqual([]);
  });

  test("removes another member for an administrator", async () => {
    const { calls, service } = createHarness({ members: [plainMember] });

    await service.removeMember({
      actorUserId: "user-1",
      headers: new Headers(),
      memberId: "member-plain",
      organization: buildAccess(),
    });

    expect(calls.removed).toEqual(["member-plain"]);
  });

  test("maps the last-owner protection to a conflict", async () => {
    const { service } = createHarness({ members: [ownerMember] });

    const error = await captureError(() =>
      service.updateMemberRole({
        headers: new Headers(),
        memberId: "member-owner",
        organization: buildAccess({ role: "owner" }),
        role: "admin",
      }),
    );

    /*
     * Owner targets are refused before Better Auth is reached, so the last-owner
     * rule stays inside Better Auth and this path remains a policy denial.
     */
    expect(error.status).toBe(403);
  });
});
