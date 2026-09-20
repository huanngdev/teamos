import { expect, test } from "bun:test";
import {
  apiErrorResponseSchema,
  currentUserResponseSchema,
  organizationContextResponseSchema,
  socialProvidersResponseSchema,
} from "@teamos/shared";

import { createApp, type OrganizationServices } from "@/app.js";
import type { AuthSession, OrganizationAccess } from "@/auth/index.js";
import { loadEnv } from "@/config/index.js";
import {
  buildOrganizationAccess,
  createFakeAuthService,
  createFakeOrganizationAccessService,
  createFakeOrganizationManagementService,
  createFakeOrganizationMemberService,
  createFakeProjectService,
  createTestLogger,
} from "@/testing/organization.js";

const verifiedSession = {
  session: {
    activeOrganizationId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date("2026-01-08T00:00:00.000Z"),
    id: "session-1",
    ipAddress: null,
    token: "session-token",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    userAgent: null,
    userId: "user-1",
  },
  user: {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    email: "ada@example.com",
    emailVerified: true,
    id: "user-1",
    image: null,
    name: "Ada Lovelace",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
} satisfies AuthSession;

const organizationAccess = buildOrganizationAccess();

function createOrganizationServices(
  organizations: readonly OrganizationAccess[],
): OrganizationServices {
  const members = createFakeOrganizationMemberService([
    {
      email: "ada@example.com",
      id: "member-1",
      image: null,
      name: "Ada Lovelace",
      role: "owner",
      userId: "user-1",
    },
  ]);

  return {
    management: createFakeOrganizationManagementService(),
    members,
    organizationAccess: createFakeOrganizationAccessService(organizations),
    projects: createFakeProjectService(),
  };
}

function createTestApp(
  options: {
    organization?: OrganizationServices;
    session?: AuthSession | null;
    source?: Record<string, string | undefined>;
  } = {},
) {
  const env = loadEnv({
    NODE_ENV: "test",
    RATE_LIMIT_ENABLED: "false",
    ...options.source,
  });

  return createApp({
    auth: createFakeAuthService(options.session ?? null),
    env,
    logger: createTestLogger(),
    organization: options.organization,
  });
}

async function readErrorResponse(response: Response) {
  const result = apiErrorResponseSchema.safeParse(await response.json());

  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error("Expected an API error response.");
  }

  return result.data;
}

test("reports social provider availability from the environment", async () => {
  const app = createTestApp({
    source: {
      GOOGLE_CLIENT_ID: "google-id",
      GOOGLE_CLIENT_SECRET: "google-secret",
    },
  });
  const response = await app.request("/api/authentication/providers");
  const body = socialProvidersResponseSchema.parse(await response.json());

  expect(response.status).toBe(200);
  expect(body.providers).toEqual([
    { enabled: true, id: "google", name: "Google" },
    { enabled: false, id: "github", name: "GitHub" },
  ]);
});

test("mounts the Better Auth handler at the auth base path", async () => {
  const app = createTestApp();
  const response = await app.request("/api/auth/get-session");

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("auth-handler");
});

test("requires authentication for the current user endpoint", async () => {
  const app = createTestApp();
  const response = await app.request("/api/me");
  const body = await readErrorResponse(response);

  expect(response.status).toBe(401);
  expect(body.error.code).toBe("UNAUTHENTICATED");
});

test("returns an unverified session so the client can route to verification", async () => {
  const app = createTestApp({
    session: {
      ...verifiedSession,
      user: { ...verifiedSession.user, emailVerified: false },
    },
  });
  const response = await app.request("/api/me");
  const body = currentUserResponseSchema.parse(await response.json());

  expect(response.status).toBe(200);
  expect(body.user.emailVerified).toBe(false);
});

test("returns the authenticated user and session", async () => {
  const app = createTestApp({ session: verifiedSession });
  const response = await app.request("/api/me");
  const body = currentUserResponseSchema.parse(await response.json());

  expect(response.status).toBe(200);
  expect(body.user.email).toBe("ada@example.com");
  expect(body.user.emailVerified).toBe(true);
  expect(body.session.expiresAt).toBe("2026-01-08T00:00:00.000Z");
  expect(body.session.activeOrganizationId).toBeNull();
});

test("hides organizations the user is not a member of", async () => {
  const app = createTestApp({
    organization: createOrganizationServices([]),
    session: verifiedSession,
  });
  const response = await app.request("/api/organizations/analytical-engines");
  const body = await readErrorResponse(response);

  expect(response.status).toBe(404);
  expect(body.error.code).toBe("ORGANIZATION_NOT_FOUND");
});

test("returns the organization context with the member count", async () => {
  const app = createTestApp({
    organization: createOrganizationServices([organizationAccess]),
    session: verifiedSession,
  });
  const response = await app.request("/api/organizations/analytical-engines");
  const body = organizationContextResponseSchema.parse(await response.json());

  expect(response.status).toBe(200);
  expect(body.organization.slug).toBe("analytical-engines");
  expect(body.organization.role).toBe("owner");
  expect(body.organization.memberCount).toBe(1);
});

test("requires a verified session for organization access", async () => {
  const app = createTestApp({ organization: createOrganizationServices([organizationAccess]) });
  const response = await app.request("/api/organizations/analytical-engines");

  expect(response.status).toBe(401);
});

test("documents the cookie session scheme for protected operations", async () => {
  const app = createTestApp();
  const document = (await (await app.request("/openapi.json")).json()) as {
    components?: { securitySchemes?: Record<string, { in: string; name: string; type: string }> };
    paths: Record<string, { get?: { security?: unknown } }>;
  };

  expect(document.components?.securitySchemes?.sessionCookie).toMatchObject({
    in: "cookie",
    name: "better-auth.session_token",
    type: "apiKey",
  });
  expect(document.paths["/api/me"]?.get?.security).toEqual([{ sessionCookie: [] }]);
});
