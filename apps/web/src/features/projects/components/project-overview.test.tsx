// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { apiUrl } from "@/shared";
import { projectResponse, renderWorkspace, useWorkspaceHandlers } from "@/test/workspace-fixtures";
import { server } from "@/test/server";

test("opens a project overview from its card", async () => {
  useWorkspaceHandlers();
  renderWorkspace();

  await userEvent.click(await screen.findByRole("link", { name: "Apollo" }));

  expect(await screen.findByRole("heading", { name: "Apollo" })).toBeInTheDocument();
  expect(screen.getByText("Guides the moon mission.")).toBeInTheDocument();
  expect(screen.getByText("Private")).toBeInTheDocument();
  expect(screen.getByText("Private")).not.toHaveTextContent("private");
  expect(screen.getAllByText("Lead").length).toBeGreaterThan(0);
  expect(screen.getByText("2 members")).toBeInTheDocument();
  expect(screen.getByText("charles@example.com")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "TeamOS" })).toHaveAttribute(
    "href",
    "/workspaces/acme/projects",
  );
  expect(screen.getByRole("link", { current: "page", name: "Overview" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Members" })).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Switch workspace, current workspace Analytical Engines" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Switch project, current project Apollo" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Manage members" })).toBeInTheDocument();
});

test("opens the project list from the breadcrumb", async () => {
  useWorkspaceHandlers();
  renderWorkspace("/workspaces/acme/projects/apollo");

  await userEvent.click(
    await screen.findByRole("button", { name: "Switch project, current project Apollo" }),
  );

  expect(await screen.findByRole("menuitem", { name: "Apollo" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "New project" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Projects" })).not.toBeInTheDocument();
});

test("reports an unknown project as not found", async () => {
  useWorkspaceHandlers();
  renderWorkspace("/workspaces/acme/projects/missing");

  expect(await screen.findByText("Project not found")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Apollo" })).not.toBeInTheDocument();
  expect(screen.queryByText("private")).not.toBeInTheDocument();
});

test("shows only the first five project members", async () => {
  useWorkspaceHandlers({
    projectPages: () => projectResponse,
  });
  server.use(
    http.get(
      `${apiUrl}/api/organizations/acme/projects/0a1b2c3d-0000-4000-8000-000000000001/members`,
      () =>
        HttpResponse.json({
          members: ["Ada", "Grace", "Katherine", "Margaret", "Dorothy", "Mary"].map(
            (name, index) => ({
              email: `${name.toLowerCase()}@example.com`,
              image: null,
              memberId: `member-${index}`,
              name,
              role: "member",
              userId: `user-${index}`,
            }),
          ),
        }),
    ),
  );
  renderWorkspace("/workspaces/acme/projects/apollo");

  expect(await screen.findByText("Showing 5 of 6")).toBeInTheDocument();
  expect(screen.getByText("grace@example.com")).toBeInTheDocument();
  expect(screen.queryByText("mary@example.com")).not.toBeInTheDocument();
});
