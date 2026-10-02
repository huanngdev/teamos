import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Route, Routes, useParams } from "react-router";
import { beforeEach, expect, test } from "vitest";

import { WorkspaceIndexRoute } from "@/routes/workspace-index-route";
import { apiUrl } from "@/shared";
import { renderWithProviders } from "@/test/render-app";
import { server } from "@/test/server";
import { organizationsResponse, sessionResponse } from "@/test/workspace-fixtures";

beforeEach(() => {
  window.localStorage.clear();
});

function WorkspaceTarget() {
  const { organizationSlug } = useParams();

  return <p>Workspace {organizationSlug} projects</p>;
}

function renderIndex() {
  return renderWithProviders(
    <Routes>
      <Route element={<WorkspaceIndexRoute />} path="/" />
      <Route element={<WorkspaceTarget />} path="/workspaces/:organizationSlug/projects" />
      <Route element={<p>New workspace form</p>} path="/workspaces/new" />
    </Routes>,
    { route: "/" },
  );
}

function useOrganizationList(list: readonly unknown[]) {
  server.use(
    http.get(`${apiUrl}/api/me`, () => HttpResponse.json(sessionResponse)),
    http.get(`${apiUrl}/api/auth/organization/list`, () => HttpResponse.json(list)),
  );
}

test("opens the newest workspace when nothing is remembered", async () => {
  useOrganizationList(organizationsResponse);

  renderIndex();

  expect(await screen.findByText("Workspace acme projects")).toBeInTheDocument();
});

test("reopens the remembered workspace instead of the newest one", async () => {
  window.localStorage.setItem("teamos.recent-workspace.user-1", "difference");
  useOrganizationList(organizationsResponse);

  renderIndex();

  expect(await screen.findByText("Workspace difference projects")).toBeInTheDocument();
});

test("ignores a remembered workspace the user no longer belongs to", async () => {
  window.localStorage.setItem("teamos.recent-workspace.user-1", "removed-workspace");
  useOrganizationList(organizationsResponse);

  renderIndex();

  expect(await screen.findByText("Workspace acme projects")).toBeInTheDocument();
});

test("sends a user without workspaces to workspace creation", async () => {
  useOrganizationList([]);

  renderIndex();

  expect(await screen.findByText("New workspace form")).toBeInTheDocument();
});

test("sends a user with no workspaces to creation even with a stale preference", async () => {
  window.localStorage.setItem("teamos.recent-workspace.user-1", "removed-workspace");
  useOrganizationList([]);

  renderIndex();

  expect(await screen.findByText("New workspace form")).toBeInTheDocument();
});
