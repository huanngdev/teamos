import { expect, test } from "bun:test";
import {
  apiErrorResponseSchema,
  invitationListResponseSchema,
  invitationResponseSchema,
  memberListResponseSchema,
} from "@teamos/shared";
import type { OrganizationMember } from "@teamos/shared";

import { createApp, type OrganizationServices } from "@/app.js";
import type { OrganizationAccess, OrganizationGateway } from "@/auth/index.js";
import { loadEnv } from "@/config/index.js";
import { createOrganizationManagementService } from "@/services/index.js";
import {
  buildOrganizationAccess,
  buildSession,
  createFakeAuthService,
  createFakeOrganizationAccessService,
  createFakeOrganizationGateway,
  createFakeOrganizationMemberService,
  createFakeProjectService,
  createTestLogger,
} from "@/testing/organization.js";

const ownerAccess = buildOrganizationAccess({ memberId: "member-owner", role: "owner" });
const adminAccess = buildOrganizationAccess({ memberId: "member-admin", role: "admin" });
const memberAccess = buildOrganizationAccess({ memberId: "member-plain", role: "member" });
const session = buildSession({ userId: "user-1" });

const ownerMember: OrganizationMember = {
  email: "owner@example.com",
  id: "member-owner",
  image: null,
  name: "Olivia Owner",
  role: "owner",
  userId: "user-owner",
};

const plainMember: OrganizationMember = {
  email: "ada@example.com",
  id: "member-plain",
  image: null,
  name: "Ada Lovelace",
  role: "member",
  userId: "user-1",
};

interface TestAppOptions {
  actorAccess?: OrganizationAccess;
  env?: Record<string, string | undefined>;
  gateway?: Partial<OrganizationGateway>;
  members?: readonly OrganizationMember[];
}

function createTestApp(options: TestAppOptions = {}) {
  const actorAccess = options.actorAccess ?? ownerAccess;
  const logger = createTestLogger();
  const members = createFakeOrganizationMemberService(
    options.members ?? [ownerMember, plainMember],
  );
  const gateway: OrganizationGateway = {
    ...createFakeOrganizationGateway(),
    ...options.gateway,
  };
  const organization: OrganizationServices = {
    management: createOrganizationManagementService({ gateway, logger, members }),
    members,
    organizationAccess: createFakeOrganizationAccessService([actorAccess]),
    projects: createFakeProjectService(),
  };

  return createApp({
    auth: createFakeAuthService(session),
    env: loadEnv({
      NODE_ENV: "test",
      MANAGEMENT_RATE_LIMIT_POINTS: "1000",
      RATE_LIMIT_ENABLED: "false",
      RATE_LIMIT_POINTS: "1000",
      ...options.env,
    }),
    logger,
    organization,
  });
}

function postJson(body: unknown): RequestInit {
  return {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  };
}

async function readErrorCode(response: Response): Promise<string> {
  const result = apiErrorResponseSchema.safeParse(await response.json());

  if (!result.success) {
    throw new Error("Expected an API error response.");
  }

  return result.data.error.code;
}

test("returns a paginated member page for a workspace member", async () => {
  const app = createTestApp({ actorAccess: memberAccess });
  const response = await app.request("/api/organizations/analytical-engines/members?limit=1");

  expect(response.status).toBe(200);

  const body = memberListResponseSchema.parse(await response.json());

  expect(body.members).toHaveLength(1);
  expect(body.pagination).toEqual({ limit: 1, offset: 0, total: 2 });
  expect(body.members[0]?.email).toBe("owner@example.com");
});

test("filters members by name or email without crossing the workspace boundary", async () => {
  const app = createTestApp({ actorAccess: memberAccess });
  const response = await app.request(
    "/api/organizations/analytical-engines/members?search=ADA%40example",
  );
  const body = memberListResponseSchema.parse(await response.json());

  expect(response.status).toBe(200);
  expect(body.members.map((member) => member.id)).toEqual(["member-plain"]);
  expect(body.pagination.total).toBe(1);
});

test("rejects a member page window beyond the hard maximum", async () => {
  const app = createTestApp({ actorAccess: memberAccess });
  const response = await app.request("/api/organizations/analytical-engines/members?limit=500");
  const body = apiErrorResponseSchema.parse(await response.json());

  expect(response.status).toBe(422);
  expect(body.error.code).toBe("VALIDATION_ERROR");
});

test("hides the member list from a user who is not a workspace member", async () => {
  const app = createTestApp();
  const response = await app.request("/api/organizations/another-workspace/members");

  expect(response.status).toBe(404);
  expect(await readErrorCode(response)).toBe("ORGANIZATION_NOT_FOUND");
});

test("does not let an ordinary member invite anyone", async () => {
  const app = createTestApp({ actorAccess: memberAccess });
  const response = await app.request(
    "/api/organizations/analytical-engines/invitations",
    postJson({ email: "new@example.com", role: "member" }),
  );

  expect(response.status).toBe(403);
  expect(await readErrorCode(response)).toBe("FORBIDDEN");
});

test("does not let an ordinary member read pending invitations", async () => {
  const app = createTestApp({ actorAccess: memberAccess });
  const response = await app.request("/api/organizations/analytical-engines/invitations");

  expect(response.status).toBe(403);
  expect(await readErrorCode(response)).toBe("FORBIDDEN");
});

test("invites a member and normalizes the email", async () => {
  const received: { email: string; role: string }[] = [];
  const app = createTestApp({
    gateway: {
      createInvitation: async ({ email, role }) => {
        received.push({ email, role });

        return {
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          email,
          expiresAt: new Date("2026-01-03T00:00:00.000Z"),
          id: "invitation-9",
          inviterId: "user-1",
          organizationId: "org-1",
          role,
          status: "pending",
        };
      },
    },
  });
  const response = await app.request(
    "/api/organizations/analytical-engines/invitations",
    postJson({ email: "  NEW@Example.COM ", role: "admin" }),
  );

  expect(response.status).toBe(201);
  expect(received).toEqual([{ email: "new@example.com", role: "admin" }]);

  const body = invitationResponseSchema.parse(await response.json());

  expect(body.invitation.id).toBe("invitation-9");
});

test("rejects an owner role in an invitation before it reaches the auth service", async () => {
  let invoked = false;
  const app = createTestApp({
    gateway: {
      createInvitation: async () => {
        invoked = true;

        throw new Error("should not be called");
      },
    },
  });
  const response = await app.request(
    "/api/organizations/analytical-engines/invitations",
    postJson({ email: "new@example.com", role: "owner" }),
  );

  expect(response.status).toBe(422);
  expect(invoked).toBe(false);
});

test("forwards the caller session cookie to the auth server API", async () => {
  let received: Headers | undefined;
  const app = createTestApp({
    actorAccess: adminAccess,
    gateway: {
      createInvitation: async ({ email, headers, role }) => {
        received = headers;

        return {
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          email,
          expiresAt: new Date("2026-01-03T00:00:00.000Z"),
          id: "invitation-1",
          inviterId: "user-1",
          organizationId: "org-1",
          role,
          status: "pending",
        };
      },
    },
  });
  await app.request("/api/organizations/analytical-engines/invitations", {
    ...postJson({ email: "new@example.com" }),
    headers: {
      "content-type": "application/json",
      cookie: "better-auth.session_token=abc",
    },
  });

  expect(received?.get("cookie")).toBe("better-auth.session_token=abc");
});

test("does not let an admin change an owner through the role endpoint", async () => {
  const app = createTestApp({ actorAccess: adminAccess });
  const response = await app.request(
    "/api/organizations/analytical-engines/members/member-owner/role",
    {
      body: JSON.stringify({ role: "member" }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    },
  );

  expect(response.status).toBe(403);
  expect(await readErrorCode(response)).toBe("FORBIDDEN");
});

test("does not let an actor remove themselves from a row action", async () => {
  const app = createTestApp({ actorAccess: ownerAccess });
  const response = await app.request("/api/organizations/analytical-engines/members/member-plain", {
    method: "DELETE",
  });

  /*
   * The acting user is user-1 and the target member belongs to user-1, so the
   * row action is refused even though the actor is the workspace owner.
   */
  expect(response.status).toBe(400);
  expect(await readErrorCode(response)).toBe("CONFLICT");
});

test("never accepts an owner role through the role endpoint", async () => {
  const app = createTestApp();
  const response = await app.request(
    "/api/organizations/analytical-engines/members/member-plain/role",
    {
      body: JSON.stringify({ role: "owner" }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    },
  );

  expect(response.status).toBe(422);
});

test("blocks direct calls to the replaced Better Auth management endpoints", async () => {
  const app = createTestApp();
  const blocked = [
    "/api/auth/organization/get-full-organization",
    "/api/auth/organization/list-invitations",
    "/api/auth/organization/list-members",
    "/api/auth/organization/invite-member",
    "/api/auth/organization/cancel-invitation",
    "/api/auth/organization/update-member-role",
    "/api/auth/organization/remove-member",
    "/api/auth/organization/list-invitations/",
    "/api/auth/organization/%69nvite-member",
  ];

  for (const path of blocked) {
    const response = await app.request(path);

    expect(response.status).toBe(404);
  }
});

test("keeps the native invitation acceptance endpoints available", async () => {
  const app = createTestApp();
  const response = await app.request(
    "/api/auth/organization/accept-invitation",
    postJson({ invitationId: "invitation-1" }),
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("auth-handler");
});

test("lists pending invitations for an administrator", async () => {
  const app = createTestApp({
    gateway: {
      listInvitations: async () => [
        {
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          email: "invited@example.com",
          expiresAt: new Date("2030-01-03T00:00:00.000Z"),
          id: "invitation-1",
          inviterId: "user-1",
          organizationId: "org-1",
          role: "member",
          status: "pending",
        },
      ],
    },
  });
  const response = await app.request("/api/organizations/analytical-engines/invitations");
  const body = invitationListResponseSchema.parse(await response.json());

  expect(response.status).toBe(200);
  expect(body.invitations).toHaveLength(1);
  expect(body.invitations[0]?.email).toBe("invited@example.com");
});

test("rate limits management actions per actor", async () => {
  const app = createTestApp({
    actorAccess: memberAccess,
    env: { MANAGEMENT_RATE_LIMIT_POINTS: "1", RATE_LIMIT_ENABLED: "true" },
  });

  const first = await app.request("/api/organizations/analytical-engines/members");
  const second = await app.request("/api/organizations/analytical-engines/members");

  expect(first.status).toBe(200);
  expect(second.status).toBe(429);
  expect(await readErrorCode(second)).toBe("RATE_LIMIT_EXCEEDED");
});
