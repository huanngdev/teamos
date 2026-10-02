import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { apiUrl } from "@/shared";
import { projectResponse, renderWorkspace, useWorkspaceHandlers } from "@/test/workspace-fixtures";
import { server } from "@/test/server";

test("renders the workspace shell with tab counts and project cards", async () => {
  useWorkspaceHandlers();
  renderWorkspace();

  const switcher = await screen.findByRole("button", {
    name: "Switch workspace, current workspace Analytical Engines",
  });

  expect(switcher).toHaveClass("min-w-0");
  expect(within(switcher).getByText("Analytical Engines")).toHaveClass("truncate");

  expect(await screen.findByRole("tab", { name: "Members 2" })).toBeInTheDocument();
  expect(await screen.findByRole("tab", { name: "Projects 1" })).toBeInTheDocument();

  const projectHeading = await screen.findByRole("heading", { name: "Apollo" });

  expect(projectHeading).toBeInTheDocument();
  expect(screen.getByText("Private")).toBeInTheDocument();
  expect(screen.getByText("2 members")).toBeInTheDocument();
});

test("keeps the tab count stable while a project search is active", async () => {
  useWorkspaceHandlers({
    /* Only the unfiltered request returns the project, so the tab badge keeps
       reporting the workspace total while the list is empty. */
    projectPages: (url) =>
      url.searchParams.get("search") === null ? projectResponse : { projects: [] },
  });
  renderWorkspace();

  await screen.findByRole("heading", { name: "Apollo" });

  await userEvent.type(screen.getByLabelText("Search projects"), "nothing");

  expect(
    await screen.findByText("No projects match your search", {}, { timeout: 3000 }),
  ).toBeInTheDocument();
  expect(await screen.findByRole("tab", { name: "Projects 1" })).toBeInTheDocument();
});

test("routes between the projects and members tabs", async () => {
  useWorkspaceHandlers();
  renderWorkspace();

  await userEvent.click(await screen.findByRole("tab", { name: "Members 2" }));

  expect(await screen.findByText("Charles Babbage")).toBeInTheDocument();
});

test("refreshes the members route directly", async () => {
  useWorkspaceHandlers();
  renderWorkspace("/workspaces/acme/members");

  expect(await screen.findByRole("tab", { name: "Members 2", selected: true })).toBeInTheDocument();
  expect(await screen.findByText("Charles Babbage")).toBeInTheDocument();
});

test("signs out from the account menu", async () => {
  useWorkspaceHandlers();
  renderWorkspace();

  await userEvent.click(await screen.findByRole("button", { name: "Open account menu" }));

  expect(await screen.findByText("ada@example.com")).toBeInTheDocument();

  /* The server drops the session cookie, so the next session read is a 401. */
  server.use(
    http.get(`${apiUrl}/api/me`, () =>
      HttpResponse.json(
        {
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication is required.",
            requestId: "request-1",
          },
        },
        { status: 401 },
      ),
    ),
  );

  await userEvent.click(await screen.findByRole("menuitem", { name: "Log out" }));

  expect(await screen.findByText("Sign in to TeamOS")).toBeInTheDocument();
});

test("keeps the user signed in when sign-out fails", async () => {
  useWorkspaceHandlers();
  renderWorkspace();

  await screen.findByRole("heading", { name: "Apollo" });

  server.use(
    http.post(`${apiUrl}/api/auth/sign-out`, () =>
      HttpResponse.json(
        { error: { code: "SIGN_OUT_FAILED", message: "Sign-out failed." } },
        { status: 500 },
      ),
    ),
  );

  await userEvent.click(await screen.findByRole("button", { name: "Open account menu" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Log out" }));

  expect(await screen.findByText("Sign-out failed")).toBeInTheDocument();
  expect(screen.queryByText("Sign in to TeamOS")).not.toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "Apollo" })).toBeInTheDocument();
});

test("shows a not-found state when the user cannot access the workspace", async () => {
  useWorkspaceHandlers();
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
  );

  renderWorkspace("/workspaces/missing/projects");

  expect(await screen.findByText("Workspace not found")).toBeInTheDocument();
});
