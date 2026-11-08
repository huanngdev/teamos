import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const gateIssue = {
  assignees: [],
  content: null,
  contentText: "Keep the gate notes",
  createdAt: "2026-01-01T00:00:00.000Z",
  id: "issue-1",
  number: "1",
  position: 0,
  priority: "none",
  statusId: "11111111-1111-4111-8111-111111111111",
  title: "Check the gate",
  updatedAt: "2026-01-02T00:00:00.000Z",
} as const;

test("opens an issue page from its canonical code", async () => {
  server.use(http.get(`${apiUrl}/health/ready`, () => HttpResponse.json(healthyReadiness)));
  useWorkspaceHandlers();
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issues/by-number/:number`, () =>
      HttpResponse.json({ issue: gateIssue }),
    ),
  );
  renderWithProviders(<AppRoutes />, { route: "/w/acme/p/apollo/issues/I-0001" });

  expect(await screen.findByLabelText("Title")).toHaveValue("Check the gate");
  expect(screen.getByText("I-0001")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "All issues" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Issue actions" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add sub-issues" })).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    screen.getAllByRole("link", { name: "Issues" }).some((link) => {
      return link.getAttribute("aria-current") === "page";
    }),
  ).toBe(true);
  expect(
    screen.getAllByRole("link", { name: "Board" }).every((link) => {
      return link.getAttribute("aria-current") !== "page";
    }),
  ).toBe(true);
});

test("replaces a padded issue code with the canonical code", async () => {
  const requested: string[] = [];

  server.use(http.get(`${apiUrl}/health/ready`, () => HttpResponse.json(healthyReadiness)));
  useWorkspaceHandlers();
  server.use(
    http.get(
      `${apiUrl}/api/organizations/acme/projects/:projectId/issues/by-number/:number`,
      ({ params }) => {
        requested.push(String(params.number));

        return HttpResponse.json({ issue: gateIssue });
      },
    ),
  );
  renderWithProviders(<AppRoutes />, { route: "/w/acme/p/apollo/issues/I-1" });

  expect(await screen.findByLabelText("Title")).toHaveValue("Check the gate");
  expect(screen.getByText("I-0001")).toBeInTheDocument();
  expect(requested).toEqual(["1"]);
});

test("saves a detail edit after the draft stays still", async () => {
  const user = userEvent.setup();
  const patches: unknown[] = [];

  server.use(http.get(`${apiUrl}/health/ready`, () => HttpResponse.json(healthyReadiness)));
  useWorkspaceHandlers();
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issues/by-number/:number`, () =>
      HttpResponse.json({ issue: gateIssue }),
    ),
    http.patch(
      `${apiUrl}/api/organizations/acme/projects/:projectId/issues/:issueId`,
      async ({ request }) => {
        const body = await request.json();
        patches.push(body);

        return HttpResponse.json({
          issue: {
            ...gateIssue,
            title: "Check the gate now",
            updatedAt: "2026-01-03T00:00:00.000Z",
          },
        });
      },
    ),
  );
  renderWithProviders(<AppRoutes />, { route: "/w/acme/p/apollo/issues/I-0001" });

  const title = await screen.findByLabelText("Title");
  await user.type(title, " now");

  expect(patches).toEqual([]);
  await waitFor(() => {
    expect(patches).toHaveLength(1);
  });
  expect(patches[0]).toMatchObject({
    expectedUpdatedAt: gateIssue.updatedAt,
    title: "Check the gate now",
  });
  expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
});

test("rejects an issue code without requesting the issue", async () => {
  let requested = false;

  server.use(http.get(`${apiUrl}/health/ready`, () => HttpResponse.json(healthyReadiness)));
  useWorkspaceHandlers();
  server.use(
    http.get(
      `${apiUrl}/api/organizations/acme/projects/:projectId/issues/by-number/:number`,
      () => {
        requested = true;

        return HttpResponse.json({ issue: gateIssue });
      },
    ),
  );
  renderWithProviders(<AppRoutes />, { route: "/w/acme/p/apollo/issues/nope" });

  expect(await screen.findByText("Page not found")).toBeInTheDocument();
  expect(screen.getByText(/\/w\/acme\/p\/apollo\/issues\/nope/)).toBeInTheDocument();
  expect(requested).toBe(false);
});

test("opens the issue page from the list and returns to that list", async () => {
  const user = userEvent.setup();

  server.use(http.get(`${apiUrl}/health/ready`, () => HttpResponse.json(healthyReadiness)));
  useWorkspaceHandlers();
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issues`, () =>
      HttpResponse.json({
        issues: [gateIssue],
        page: 1,
        pageCount: 1,
        pageSize: 20,
        total: 1,
      }),
    ),
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issues/by-number/:number`, () =>
      HttpResponse.json({ issue: gateIssue }),
    ),
  );
  renderWithProviders(<AppRoutes />, { route: "/w/acme/p/apollo/issues?priority=high" });

  await user.click(await screen.findByRole("link", { name: "Check the gate" }));

  expect(await screen.findByRole("textbox", { name: "Title" })).toHaveValue("Check the gate");
  expect(screen.getByText("I-0001")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: "Search issues" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  const issuesLink = screen.getAllByRole("link", { name: "Issues" }).find((link) => {
    return link.getAttribute("href") === "/w/acme/p/apollo/issues";
  });

  expect(issuesLink).toBeDefined();
  await user.click(issuesLink as HTMLElement);

  expect(await screen.findByRole("textbox", { name: "Search issues" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Check the gate" })).toBeInTheDocument();
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
