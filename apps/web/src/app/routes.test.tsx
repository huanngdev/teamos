import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Navigate, Route, Routes } from "react-router";
import { expect, test } from "vitest";

import { projectBoardSegment, projectIssuesSegment } from "@/features/issues";
import { projectRoutePattern } from "@/features/projects";
import {
  createWorkspacePath,
  workspaceMembersSegment,
  workspaceProjectsSegment,
  workspaceRoutePattern,
} from "@/features/workspaces";
import { apiUrl } from "@/shared";
import { renderWithProviders } from "@/test/render-app";
import { server } from "@/test/server";
import { useWorkspaceHandlers } from "@/test/workspace-fixtures";

import { AppRoutes } from "./routes";

const healthyReadiness = {
  dependencies: {
    database: { status: "ok" },
    redis: { status: "ok" },
    storage: { status: "ok" },
  },
  service: "api",
  status: "ok",
  timestamp: "2026-01-02T03:04:05.000Z",
} as const;

function RankProbe() {
  return (
    <Routes>
      <Route element={<p>Create workspace</p>} path={createWorkspacePath} />
      <Route path={projectRoutePattern}>
        <Route element={<p>Overview</p>} index />
        <Route element={<p>Board</p>} path={projectBoardSegment} />
        <Route element={<p>Issues</p>} path={projectIssuesSegment} />
      </Route>
      <Route path={workspaceRoutePattern}>
        <Route element={<Navigate replace to={workspaceProjectsSegment} />} index />
        <Route element={<p>Projects</p>} path={workspaceProjectsSegment} />
        <Route element={<p>Members</p>} path={workspaceMembersSegment} />
      </Route>
      <Route element={<p>Missing</p>} path="*" />
    </Routes>
  );
}

test("keeps workspace creation on the static /w/new path", () => {
  renderWithProviders(<RankProbe />, { route: "/w/new" });

  expect(screen.getByText("Create workspace")).toBeInTheDocument();
});

test("opens a workspace whose slug is new at its project list", async () => {
  renderWithProviders(<RankProbe />, { route: "/w/new/projects" });

  expect(await screen.findByText("Projects")).toBeInTheDocument();
  expect(screen.queryByText("Create workspace")).not.toBeInTheDocument();
});

test("lets a project slug reuse a workspace page name", () => {
  renderWithProviders(<RankProbe />, { route: "/w/acme/p/members" });

  expect(screen.getByText("Overview")).toBeInTheDocument();
  expect(screen.queryByText("Members")).not.toBeInTheDocument();
});

test("sends a workspace entry to its project list", async () => {
  renderWithProviders(<RankProbe />, { route: "/w/acme" });

  expect(await screen.findByText("Projects")).toBeInTheDocument();
});

test("does not register the old workspace or board urls", async () => {
  renderWithProviders(<AppRoutes />, {
    route: "/workspaces/acme/projects/website/issues/board?priority=high",
  });

  expect(await screen.findByText("Page not found")).toBeInTheDocument();
  expect(
    screen.getByText(/\/workspaces\/acme\/projects\/website\/issues\/board/),
  ).toBeInTheDocument();
});

test("opens the board from the short project path", async () => {
  server.use(http.get(`${apiUrl}/health/ready`, () => HttpResponse.json(healthyReadiness)));
  useWorkspaceHandlers();
  renderWithProviders(<AppRoutes />, { route: "/w/acme/p/apollo/board" });

  expect(await screen.findByText("Backlog")).toBeInTheDocument();
  expect(
    screen.getAllByRole("link", { name: "Board" }).some((link) => {
      return link.getAttribute("aria-current") === "page";
    }),
  ).toBe(true);
});
