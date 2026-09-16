// @vitest-environment jsdom

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { expect, test } from "vitest";

import { apiUrl } from "@/lib/env";

import { WorkspacePage } from "./WorkspacePage";
import { renderWithProviders } from "../test/render-app";
import { server } from "../test/server";

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

const organizationResponse = {
  organization: {
    id: "org-1",
    logo: null,
    members: [
      {
        email: "ada@example.com",
        id: "member-1",
        image: null,
        name: "Ada Lovelace",
        role: "owner",
        userId: "user-1",
      },
    ],
    name: "Analytical Engines",
    role: "owner",
    slug: "acme",
  },
} as const;

const secondOrganizationResponse = {
  organization: {
    id: "org-2",
    logo: null,
    members: [],
    name: "Difference Engine",
    role: "member",
    slug: "difference",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "org-2",
    logo: null,
    metadata: null,
    name: "Difference Engine",
    slug: "difference",
  },
] as const;

function useDefaultHandlers() {
  server.use(
    http.get(`${apiUrl}/api/auth/get-session`, () => HttpResponse.json(sessionResponse)),
    http.get(`${apiUrl}/api/auth/organization/list`, () =>
      HttpResponse.json(organizationsResponse),
    ),
    http.get(`${apiUrl}/api/organizations/acme`, () => HttpResponse.json(organizationResponse)),
    http.get(`${apiUrl}/api/organizations/difference`, () =>
      HttpResponse.json(secondOrganizationResponse),
    ),
  );
}

function renderWorkspace(route = "/acme") {
  return renderWithProviders(
    <Routes>
      <Route element={<WorkspacePage />} path="/:organizationSlug" />
      <Route element={<p>Sign in to TeamOS</p>} path="/login" />
      <Route element={<p>New workspace form</p>} path="/new-workspace" />
    </Routes>,
    { route },
  );
}

test("renders the workspace context returned by the API", async () => {
  useDefaultHandlers();
  renderWorkspace();

  const switcher = await screen.findByRole("button", {
    name: "Switch workspace, current workspace Analytical Engines",
  });

  expect(switcher).toHaveClass("min-w-0");
  expect(within(switcher).getByText("Analytical Engines")).toHaveClass("truncate");

  const projectsTab = await screen.findByRole("tab", { name: "Projects 0" });
  const membersTab = await screen.findByRole("tab", { name: "Members 1" });

  expect(within(projectsTab).getByText("0")).toBeInTheDocument();
  expect(within(membersTab).getByText("1")).toBeInTheDocument();

  await userEvent.click(membersTab);

  expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
  expect(screen.getByText("owner")).toBeInTheDocument();
  expect(screen.queryByText(/in this workspace/u)).not.toBeInTheDocument();
});

test("shows an empty projects tab by default", async () => {
  useDefaultHandlers();
  renderWorkspace();

  expect(await screen.findByText("No projects yet")).toBeInTheDocument();
  expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
});

test("switches to another workspace from the workspace menu", async () => {
  useDefaultHandlers();
  renderWorkspace();

  await userEvent.click(
    await screen.findByRole("button", {
      name: "Switch workspace, current workspace Analytical Engines",
    }),
  );

  await userEvent.click(await screen.findByRole("menuitem", { name: "Difference Engine" }));

  expect(
    await screen.findByRole("button", {
      name: "Switch workspace, current workspace Difference Engine",
    }),
  ).toBeInTheDocument();
});

test("offers a shortcut to create a workspace", async () => {
  useDefaultHandlers();
  renderWorkspace();

  await userEvent.click(
    await screen.findByRole("button", {
      name: "Switch workspace, current workspace Analytical Engines",
    }),
  );
  await userEvent.click(await screen.findByRole("menuitem", { name: "New workspace" }));

  expect(await screen.findByText("New workspace form")).toBeInTheDocument();
});

test("keeps unfinished account actions disabled and signs out", async () => {
  useDefaultHandlers();
  renderWorkspace();

  await userEvent.click(await screen.findByRole("button", { name: "Open account menu" }));

  expect(screen.getByText("AL")).toBeInTheDocument();
  for (const label of ["Profile", "Billing", "Settings", "GitHub", "Support"]) {
    expect(await screen.findByRole("menuitem", { name: label })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  }

  server.use(http.post(`${apiUrl}/api/auth/sign-out`, () => HttpResponse.json({ success: true })));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Log out" }));

  expect(await screen.findByText("Sign in to TeamOS")).toBeInTheDocument();
});

test("shows a not-found state when the user cannot access the workspace", async () => {
  server.use(
    http.get(`${apiUrl}/api/auth/get-session`, () => HttpResponse.json(sessionResponse)),
    http.get(`${apiUrl}/api/auth/organization/list`, () => HttpResponse.json([])),
    http.get(`${apiUrl}/api/organizations/missing`, () =>
      HttpResponse.json(
        {
          error: {
            code: "ORGANIZATION_NOT_FOUND",
            message: "The organization was not found.",
            requestId: "request-1",
          },
        },
        { status: 404 },
      ),
    ),
  );

  renderWorkspace("/missing");

  expect(await screen.findByText("Workspace not found")).toBeInTheDocument();
});
