// @vitest-environment jsdom

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { apiUrl } from "@/shared";
import { renderWorkspace, useWorkspaceHandlers } from "@/test/workspace-fixtures";
import { server } from "@/test/server";

test("lists projects as cards with heading, visibility, and member count", async () => {
  useWorkspaceHandlers();
  renderWorkspace();

  expect(await screen.findByRole("heading", { name: "Apollo" })).toBeInTheDocument();
  expect(screen.getByText("Guides the moon mission.")).toBeInTheDocument();
  expect(screen.getByText("Private")).toBeInTheDocument();
  expect(screen.getByText("2 members")).toBeInTheDocument();
  expect(screen.getByText("Lead")).toBeInTheDocument();
  expect(screen.getByText("Jan 1, 2026")).toBeInTheDocument();
});

test("searches projects only after the user stops typing", async () => {
  const projectRequests: { search: string | null }[] = [];

  useWorkspaceHandlers({ projectRequests });
  renderWorkspace();

  await screen.findByRole("heading", { name: "Apollo" });

  projectRequests.length = 0;
  await userEvent.type(screen.getByLabelText("Search projects"), "apollo");

  await waitFor(() => {
    expect(projectRequests.some((request) => request.search === "apollo")).toBe(true);
  });

  const searchedRequests = projectRequests.filter(
    (request) => request.search !== null && request.search.length > 0,
  );

  expect(searchedRequests).toEqual([{ search: "apollo" }]);
});

test("shows an empty result state when no project matches the search", async () => {
  useWorkspaceHandlers({
    projectPages: () => ({ projects: [] }),
  });
  renderWorkspace();

  const input = await screen.findByLabelText("Search projects");

  await userEvent.type(input, "nothing");

  expect(
    await screen.findByText("No projects match your search", {}, { timeout: 3000 }),
  ).toBeInTheDocument();
});

test("creates a project with a slug derived from the name", async () => {
  const created: unknown[] = [];

  useWorkspaceHandlers();
  server.use(
    http.post(`${apiUrl}/api/organizations/acme/projects`, async ({ request }) => {
      created.push(await request.json());

      return HttpResponse.json(
        {
          project: {
            createdAt: "2026-01-01T00:00:00.000Z",
            description: null,
            id: "0a1b2c3d-0000-4000-8000-000000000002",
            memberCount: 1,
            name: "Babbage Engine",
            role: "lead",
            slug: "babbage-engine",
            updatedAt: "2026-01-01T00:00:00.000Z",
            visibility: "private",
          },
        },
        { status: 201 },
      );
    }),
  );

  renderWorkspace();

  await userEvent.click(await screen.findByRole("button", { name: "New project" }));

  const dialog = await screen.findByRole("dialog");

  const visibilityTrigger = within(dialog).getByLabelText("Project visibility");

  expect(visibilityTrigger).toHaveTextContent("Workspace");
  expect(visibilityTrigger).not.toHaveTextContent("workspace");

  await userEvent.type(within(dialog).getByLabelText("Name"), "Babbage Engine");
  await userEvent.click(within(dialog).getByRole("button", { name: "Create project" }));

  await waitFor(() => {
    expect(created).toEqual([
      { name: "Babbage Engine", slug: "babbage-engine", visibility: "workspace" },
    ]);
  });
});

test("hides the project role from a member without a project role", async () => {
  useWorkspaceHandlers({
    projectPages: () => ({
      projects: [
        {
          createdAt: "2026-01-01T00:00:00.000Z",
          description: null,
          id: "0a1b2c3d-0000-4000-8000-000000000003",
          memberCount: 1,
          name: "Workspace project",
          role: null,
          slug: "workspace-project",
          updatedAt: "2026-01-01T00:00:00.000Z",
          visibility: "workspace",
        },
      ],
    }),
    role: "member",
  });
  renderWorkspace();

  const heading = await screen.findByRole("heading", { name: "Workspace project" });

  expect(heading).toBeInTheDocument();
  expect(screen.queryByText("Lead")).not.toBeInTheDocument();
});
