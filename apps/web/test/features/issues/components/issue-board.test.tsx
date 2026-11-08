import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { apiUrl } from "@/shared";
import { projectResponse, renderWorkspace, useWorkspaceHandlers } from "@/test/workspace-fixtures";
import { server } from "@/test/server";

const createdIssue = {
  assignees: [],
  content: null,
  contentText: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  id: "33333333-3333-4333-8333-333333333333",
  number: "1",
  position: 0,
  priority: "none",
  statusId: "11111111-1111-4111-8111-111111111111",
  title: "Check the gate",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("fades the issue list and the column row as they scroll", async () => {
  useWorkspaceHandlers();
  renderWorkspace("/w/acme/p/apollo/board");

  expect(await screen.findByText("Backlog")).toBeInTheDocument();

  const viewports = [...document.querySelectorAll("[data-slot='scroll-area-viewport']")].map(
    (node) => [...node.classList],
  );

  expect(viewports.filter((names) => names.includes("scroll-fade"))).toHaveLength(2);
  expect(viewports.filter((names) => names.includes("scroll-fade-x"))).toHaveLength(1);
});

test("renders column names instead of category codes", async () => {
  useWorkspaceHandlers();
  renderWorkspace("/w/acme/p/apollo/board");

  expect(await screen.findByText("Backlog")).toBeInTheDocument();
  expect(screen.getByText("Todo")).toBeInTheDocument();
  expect(screen.queryByText("backlog")).not.toBeInTheDocument();
  expect(screen.queryByText("unstarted")).not.toBeInTheDocument();
  const issuesLinks = screen.getAllByRole("link", { name: "Issues" });
  const boardLinks = screen.getAllByRole("link", { name: "Board" });

  expect(issuesLinks.some((link) => link.getAttribute("href") === "/w/acme/p/apollo/issues")).toBe(
    true,
  );
  expect(issuesLinks.every((link) => link.getAttribute("aria-current") !== "page")).toBe(true);
  expect(boardLinks.some((link) => link.getAttribute("href") === "/w/acme/p/apollo/board")).toBe(
    true,
  );
  expect(boardLinks.some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
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
  renderWorkspace("/w/acme/p/apollo/board");

  await userEvent.click(await screen.findByRole("button", { name: "Add issue to Backlog" }));
  const dialog = await screen.findByRole("dialog");

  await userEvent.type(within(dialog).getByLabelText("Issue title"), "Check the gate");
  await userEvent.click(within(dialog).getByRole("button", { name: "Create issue" }));

  await waitFor(() => {
    expect(created).toEqual([
      {
        assigneeMemberIds: [],
        priority: "none",
        statusId: "11111111-1111-4111-8111-111111111111",
        title: "Check the gate",
      },
    ]);
  });
  expect(created[0]).not.toHaveProperty("content");
  expect(
    await screen.findByText("I-0001 was created in Backlog. It is outside the current results."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Backlog")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Check the gate" })).not.toBeInTheDocument();
});

test("hides column management from a project member", async () => {
  useWorkspaceHandlers({
    projectPages: () => ({
      projects: [{ ...projectResponse.projects[0], role: "member" }],
    }),
    role: "member",
  });
  renderWorkspace("/w/acme/p/apollo/board");

  expect(await screen.findByRole("button", { name: "Add issue to Backlog" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add column" })).not.toBeInTheDocument();
});

test("opens an issue page from a board card", async () => {
  useWorkspaceHandlers();
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issue-board`, () =>
      HttpResponse.json({
        columns: [
          {
            hasMore: false,
            issues: [
              {
                assignees: [],
                createdAt: "2026-01-01T00:00:00.000Z",
                id: createdIssue.id,
                number: "1",
                position: 0,
                priority: "none",
                statusId: "11111111-1111-4111-8111-111111111111",
                title: "Check the gate",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
            nextCursor: null,
            scope: "fixture",
            statusId: "11111111-1111-4111-8111-111111111111",
            total: 1,
          },
          {
            hasMore: false,
            issues: [],
            nextCursor: null,
            scope: "fixture",
            statusId: "22222222-2222-4222-8222-222222222222",
            total: 0,
          },
        ],
      }),
    ),
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issues/by-number/:number`, () =>
      HttpResponse.json({ issue: createdIssue }),
    ),
  );
  renderWorkspace("/w/acme/p/apollo/board");

  await userEvent.click(await screen.findByRole("button", { name: "I-0001, Check the gate" }));

  expect(await screen.findByRole("textbox", { name: "Title" })).toHaveValue("Check the gate");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();

  const boardLink = screen.getAllByRole("link", { name: "Board" }).find((link) => {
    return link.getAttribute("href") === "/w/acme/p/apollo/board";
  });

  expect(boardLink).toBeDefined();
  await userEvent.click(boardLink as HTMLElement);

  expect(await screen.findByRole("button", { name: "I-0001, Check the gate" })).toBeInTheDocument();
  expect(screen.getByText("Backlog")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("shows column management to a project lead", async () => {
  useWorkspaceHandlers({
    projectPages: () => ({
      projects: [{ ...projectResponse.projects[0], role: "lead" }],
    }),
    role: "member",
  });
  renderWorkspace("/w/acme/p/apollo/board");

  expect(await screen.findByRole("button", { name: "Add column" })).toBeInTheDocument();
});
