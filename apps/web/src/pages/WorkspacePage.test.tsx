// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { expect, test } from "vitest";

import { apiUrl } from "@/lib/env";

import { WorkspacePage } from "./WorkspacePage";
import { renderWithProviders } from "../test/render-app";
import { server } from "../test/server";

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

const organizationsResponse = [
  {
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "org-1",
    logo: null,
    metadata: null,
    name: "Analytical Engines",
    slug: "acme",
  },
] as const;

test("renders the workspace context returned by the API", async () => {
  server.use(
    http.get(`${apiUrl}/api/organizations/acme`, () => HttpResponse.json(organizationResponse)),
    http.get(`${apiUrl}/api/auth/organization/list`, () =>
      HttpResponse.json(organizationsResponse),
    ),
  );

  renderWithProviders(
    <Routes>
      <Route element={<WorkspacePage />} path="/:organizationSlug" />
    </Routes>,
    { route: "/acme" },
  );

  expect(await screen.findByText("Analytical Engines")).toBeInTheDocument();
  expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  expect(screen.getByText("owner")).toBeInTheDocument();
});

test("shows a not-found state when the user cannot access the workspace", async () => {
  server.use(
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
    http.get(`${apiUrl}/api/auth/organization/list`, () => HttpResponse.json([])),
  );

  renderWithProviders(
    <Routes>
      <Route element={<WorkspacePage />} path="/:organizationSlug" />
    </Routes>,
    { route: "/missing" },
  );

  expect(await screen.findByText("Workspace not found")).toBeInTheDocument();
});
