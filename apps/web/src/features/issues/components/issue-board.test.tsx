import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { apiUrl } from "@/shared";
import { projectResponse, renderWorkspace, useWorkspaceHandlers } from "@/test/workspace-fixtures";
import { server } from "@/test/server";

const createdIssue = {
  assigneeMemberId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  id: "33333333-3333-4333-8333-333333333333",
  number: 1,
  position: 0,
  priority: "none",
  statusId: "11111111-1111-4111-8111-111111111111",
  title: "Check the gate",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("renders column names instead of category codes", async () => {
  useWorkspaceHandlers();
  renderWorkspace("/workspaces/acme/projects/apollo/issues");

  expect(await screen.findByText("Backlog")).toBeInTheDocument();
  expect(screen.getByText("Todo")).toBeInTheDocument();
  expect(screen.queryByText("backlog")).not.toBeInTheDocument();
  expect(screen.queryByText("unstarted")).not.toBeInTheDocument();
  expect(
    screen
      .getAllByRole("link", { name: "Issues" })
      .some((link) => link.getAttribute("href") === "/workspaces/acme/projects/apollo/issues"),
  ).toBe(true);
  expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("creates an issue in the selected column", async () => {
  useWorkspaceHandlers();
  const created: unknown[] = [];

  server.use(
    http.post(
      `${apiUrl}/api/organizations/acme/projects/:projectId/issues`,
      async ({ request }) => {
        created.push(await request.json());

        return HttpResponse.json({ issue: createdIssue }, { status: 201 });
      },
    ),
  );
  renderWorkspace("/workspaces/acme/projects/apollo/issues");

  await userEvent.click(await screen.findByRole("button", { name: "Add issue to Backlog" }));
  const dialog = await screen.findByRole("dialog");

  await userEvent.type(within(dialog).getByLabelText("Title"), "Check the gate");
  await userEvent.click(within(dialog).getByRole("button", { name: "Create issue" }));

  await waitFor(() => {
    expect(created).toEqual([
      {
        assigneeMemberId: null,
        priority: "none",
        statusId: "11111111-1111-4111-8111-111111111111",
        title: "Check the gate",
      },
    ]);
  });
});

test("hides column management from a project member", async () => {
  useWorkspaceHandlers({
    projectPages: () => ({
      projects: [{ ...projectResponse.projects[0], role: "member" }],
    }),
    role: "member",
  });
  renderWorkspace("/workspaces/acme/projects/apollo/issues");

  expect(await screen.findByRole("button", { name: "Add issue to Backlog" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add column" })).not.toBeInTheDocument();
});

test("shows column management to a project lead", async () => {
  useWorkspaceHandlers({
    projectPages: () => ({
      projects: [{ ...projectResponse.projects[0], role: "lead" }],
    }),
    role: "member",
  });
  renderWorkspace("/workspaces/acme/projects/apollo/issues");

  expect(await screen.findByRole("button", { name: "Add column" })).toBeInTheDocument();
});
