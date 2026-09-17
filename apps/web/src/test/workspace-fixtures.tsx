import { http, HttpResponse } from "msw";
import { Navigate, Route, Routes } from "react-router";

import { WorkspaceLayout } from "@/layouts/workspace-layout";
import { WorkspaceMembersRoute } from "@/routes/workspace-members-route";
import { WorkspaceProjectsRoute } from "@/routes/workspace-projects-route";
import { apiUrl } from "@/shared";
import { renderWithProviders } from "@/test/render-app";
import { server } from "@/test/server";

const sessionResponse = {
  session: {
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-08T00:00:00.000Z",
    id: "session-1",
    ipAddress: null,
    token: "session-token",
    updatedAt: "2026-01-01T00:00:00.000Z",
    userAgent: null,
    userId: "user-1",
  },
  user: {
    createdAt: "2026-01-01T00:00:00.000Z",
    email: "ada@example.com",
    emailVerified: true,
    id: "user-1",
    image: null,
    name: "Ada Lovelace",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
} as const;

const organizationsResponse = [
  {
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "org-1",
    logo: null,
    metadata: null,
    name: "Analytical Engines",
    slug: "acme",
  },
  {
    createdAt: "2025-12-01T00:00:00.000Z",
    id: "org-2",
    logo: null,
    metadata: null,
    name: "Difference Engine",
    slug: "difference",
  },
] as const;

const ownerMember = {
  email: "ada@example.com",
  id: "member-1",
  image: null,
  name: "Ada Lovelace",
  role: "owner",
  userId: "user-1",
} as const;

const secondMember = {
  email: "charles@example.com",
  id: "member-2",
  image: null,
  name: "Charles Babbage",
  role: "member",
  userId: "user-2",
} as const;

function organizationContext(role: "owner" | "admin" | "member", memberCount = 2) {
  return {
    organization: {
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "org-1",
      logo: null,
      memberCount,
      name: "Analytical Engines",
      role,
      slug: "acme",
    },
  };
}

const projectResponse = {
  projects: [
    {
      createdAt: "2026-01-01T00:00:00.000Z",
      description: "Guides the moon mission.",
      id: "0a1b2c3d-0000-4000-8000-000000000001",
      memberCount: 2,
      name: "Apollo",
      role: "lead",
      slug: "apollo",
      updatedAt: "2026-01-01T00:00:00.000Z",
      visibility: "private",
    },
  ],
} as const;

interface WorkspaceHandlerOptions {
  invitations?: readonly unknown[];
  memberPages?: (url: URL) => { members: readonly unknown[]; pagination: unknown };
  memberRequests?: { search: string | null }[];
  projectPages?: (url: URL) => { projects: readonly unknown[] };
  projectRequests?: { search: string | null }[];
  role?: "owner" | "admin" | "member";
}

function useWorkspaceHandlers(options: WorkspaceHandlerOptions = {}) {
  const role = options.role ?? "owner";

  server.use(
    http.get(`${apiUrl}/api/auth/get-session`, () => HttpResponse.json(sessionResponse)),
    http.get(`${apiUrl}/api/auth/organization/list`, () =>
      HttpResponse.json(organizationsResponse),
    ),
    http.post(`${apiUrl}/api/auth/sign-out`, () => HttpResponse.json({ success: true })),
    http.get(`${apiUrl}/api/organizations/acme`, () =>
      HttpResponse.json(organizationContext(role)),
    ),
    http.get(`${apiUrl}/api/organizations/acme/projects`, ({ request }) => {
      const url = new URL(request.url);

      options.projectRequests?.push({ search: url.searchParams.get("search") });

      if (options.projectPages !== undefined) {
        return HttpResponse.json(options.projectPages(url));
      }

      return HttpResponse.json(projectResponse);
    }),
    http.get(`${apiUrl}/api/organizations/acme/invitations`, () =>
      HttpResponse.json({ invitations: options.invitations ?? [] }),
    ),
    http.get(`${apiUrl}/api/organizations/acme/members`, ({ request }) => {
      const url = new URL(request.url);

      options.memberRequests?.push({ search: url.searchParams.get("search") });

      if (options.memberPages !== undefined) {
        return HttpResponse.json(options.memberPages(url));
      }

      return HttpResponse.json({
        members: [ownerMember, secondMember],
        pagination: { limit: 25, offset: 0, total: 2 },
      });
    }),
  );
}

/*
 * Renders the real workspace route tree so tab navigation, redirects, and
 * feature routes behave exactly as they do in the app.
 */
function renderWorkspace(route = "/workspaces/acme/projects") {
  return renderWithProviders(
    <Routes>
      <Route element={<WorkspaceLayout />} path="/workspaces/:organizationSlug">
        <Route element={<Navigate replace to="projects" />} index />
        <Route element={<WorkspaceProjectsRoute />} path="projects" />
        <Route element={<WorkspaceMembersRoute />} path="members" />
      </Route>
      <Route element={<p>Sign in to TeamOS</p>} path="/login" />
      <Route element={<p>New workspace form</p>} path="/workspaces/new" />
    </Routes>,
    { route },
  );
}

export {
  organizationContext,
  organizationsResponse,
  ownerMember,
  projectResponse,
  renderWorkspace,
  secondMember,
  sessionResponse,
  useWorkspaceHandlers,
};
