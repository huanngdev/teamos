import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { apiUrl } from "@/shared";
import { server } from "@/test/server";
import { projectResponse, renderWorkspace, useWorkspaceHandlers } from "@/test/workspace-fixtures";

const viewId = "22222222-2222-4222-8222-222222222222";

const personalView = {
  createdAt: "2026-01-01T00:00:00.000Z",
  definition: {
    filters: {
      assignee: { includeCurrentUser: true, includeUnassigned: false, memberIds: [] },
      timeZone: "UTC",
    },
    version: 1,
  },
  id: viewId,
  name: "My issues",
  revision: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
  visibility: "personal",
};

const projectView = {
  ...personalView,
  definition: {
    filters: { priorities: ["high"], timeZone: "UTC" },
    version: 1,
  },
  id: "33333333-3333-4333-8333-333333333333",
  name: "High priority",
  visibility: "project",
};

function mockViews(views = [projectView, personalView]) {
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/views`, ({ request }) => {
      const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? "";
      const matched =
        search.length === 0
          ? views
          : views.filter((view) => view.name.toLowerCase().includes(search));

      return HttpResponse.json({
        pagination: { limit: 50, offset: 0, total: matched.length },
        views: matched,
      });
    }),
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/views/:viewId`, () =>
      HttpResponse.json({ view: personalView }),
    ),
  );
}

test("lists saved views in a searchable table", async () => {
  const user = userEvent.setup();
  useWorkspaceHandlers();
  mockViews();
  renderWorkspace("/workspaces/acme/projects/apollo/views");

  expect(await screen.findByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Sharing" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Filters" })).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Search views" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "High priority" })).toBeInTheDocument();
  expect(screen.getByText("Assigned to me")).toBeInTheDocument();
  expect(screen.getByText("High")).toBeInTheDocument();
  expect(screen.getByText("Personal")).toBeInTheDocument();
  expect(screen.getByText("Project")).toBeInTheDocument();
  expect(screen.queryByText("personal")).not.toBeInTheDocument();
  expect(screen.queryByText("project")).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Project views" })).not.toBeInTheDocument();
  expect(
    screen
      .getAllByRole("link", { name: "Views" })
      .some((link) => link.getAttribute("aria-current") === "page"),
  ).toBe(true);

  const viewsTrigger = screen.getByRole("button", { name: "Views" });

  await user.click(viewsTrigger);
  expect(viewsTrigger).toHaveAttribute("aria-expanded", "true");
  expect(
    within(viewsTrigger.parentElement as HTMLElement).getByRole("link", {
      hidden: true,
      name: "High priority",
    }),
  ).toBeInTheDocument();

  await user.click(viewsTrigger);
  expect(viewsTrigger).toHaveAttribute("aria-expanded", "false");

  await user.type(screen.getByRole("searchbox", { name: "Search views" }), "missing");
  expect(await screen.findByText("No views match this search.")).toBeInTheDocument();
});

test("does not offer project sharing to a viewer", async () => {
  const user = userEvent.setup();
  useWorkspaceHandlers({
    projectPages: () => ({
      projects: [{ ...projectResponse.projects[0], role: "viewer" }],
    }),
    role: "member",
  });
  mockViews([personalView]);
  renderWorkspace("/workspaces/acme/projects/apollo/views");

  await user.click(await screen.findByRole("button", { name: "New view" }));

  expect(screen.queryByLabelText("Sharing")).not.toBeInTheDocument();
  expect(await screen.findByRole("combobox", { name: "Assignee" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Priority" })).toBeInTheDocument();
  await user.keyboard("{Escape}");
  await user.click(await screen.findByRole("button", { name: "My issues actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Edit view" }));
  const editDialog = await screen.findByRole("dialog", { name: "Edit view" });
  expect(within(editDialog).queryByRole("combobox", { name: "Sharing" })).not.toBeInTheDocument();
  expect(within(editDialog).getByText("Personal")).toBeInTheDocument();
});

test("creates a view with the selected filters", async () => {
  const user = userEvent.setup();
  const created: unknown[] = [];

  useWorkspaceHandlers();
  mockViews([]);
  server.use(
    http.post(`${apiUrl}/api/organizations/acme/projects/:projectId/views`, async ({ request }) => {
      created.push(await request.json());

      return HttpResponse.json({ view: personalView }, { status: 201 });
    }),
  );
  renderWorkspace("/workspaces/acme/projects/apollo/views");

  await user.click(await screen.findByRole("button", { name: "New view" }));
  await user.type(screen.getByLabelText("Name"), "Release watch");
  await user.click(await screen.findByRole("button", { name: "Priority" }));
  await user.click(await screen.findByRole("menuitemcheckbox", { name: "High" }));
  await user.click(screen.getByRole("button", { name: "Create view" }));

  await waitFor(() => {
    expect(created).toEqual([
      expect.objectContaining({
        definition: {
          filters: { priorities: ["high"], timeZone: expect.any(String) },
          version: 1,
        },
        name: "Release watch",
        visibility: "personal",
      }),
    ]);
  });
});

test("keeps advanced filters when resetting and saving a multi-select assignee", async () => {
  const user = userEvent.setup();
  const created: unknown[] = [];

  useWorkspaceHandlers();
  mockViews([]);
  server.use(
    http.post(`${apiUrl}/api/organizations/acme/projects/:projectId/views`, async ({ request }) => {
      created.push(await request.json());

      return HttpResponse.json({ view: personalView }, { status: 201 });
    }),
  );
  renderWorkspace("/workspaces/acme/projects/apollo/views");

  await user.click(await screen.findByRole("button", { name: "New view" }));
  const dialog = await screen.findByRole("dialog", { name: "New view" });

  await user.type(within(dialog).getByLabelText("Name"), "Roster");
  await user.click(within(dialog).getByRole("combobox", { name: "Assignee" }));
  await user.click(await screen.findByRole("option", { name: "Me" }));
  await user.click(screen.getByRole("option", { name: "Unassigned" }));
  await user.click(screen.getByRole("option", { name: "Grace Hopper" }));
  expect(screen.queryByText("grace@example.com")).not.toBeInTheDocument();
  await user.click(within(dialog).getByLabelText("Name"));

  await user.click(within(dialog).getByRole("button", { name: "More filters" }));
  await user.type(within(dialog).getByLabelText("Search"), "gate");
  expect(within(dialog).getByRole("button", { name: "More filters (1)" })).toBeInTheDocument();

  await user.click(within(dialog).getByRole("button", { name: "Reset filters" }));
  expect(within(dialog).getByLabelText("Name")).toHaveValue("Roster");
  expect(within(dialog).getByLabelText("Search")).toHaveValue("");
  expect(within(dialog).getByRole("button", { name: "More filters" })).toBeInTheDocument();

  await user.click(within(dialog).getByRole("combobox", { name: "Assignee" }));
  await user.click(await screen.findByRole("option", { name: "Me" }));
  await user.click(screen.getByRole("option", { name: "Unassigned" }));
  await user.click(screen.getByRole("option", { name: "Grace Hopper" }));
  await user.click(within(dialog).getByLabelText("Name"));
  await user.type(within(dialog).getByLabelText("Search"), "gate");
  await user.click(within(dialog).getByRole("button", { name: "Create view" }));

  await waitFor(() => {
    expect(created).toEqual([
      expect.objectContaining({
        definition: {
          filters: {
            assignee: {
              includeCurrentUser: true,
              includeUnassigned: true,
              memberIds: ["member-3"],
            },
            q: "gate",
            timeZone: expect.any(String),
          },
          version: 1,
        },
        name: "Roster",
        visibility: "personal",
      }),
    ]);
  });
});

test("opens a saved view on the default board and edits its filters", async () => {
  const user = userEvent.setup();
  const issueRequests: string[] = [];
  const saved: unknown[] = [];

  useWorkspaceHandlers();
  mockViews();
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issue-board`, ({ request }) => {
      issueRequests.push(new URL(request.url).search);

      return HttpResponse.json({
        columns: [
          {
            hasMore: false,
            issues: [],
            nextCursor: null,
            scope: "fixture",
            statusId: "11111111-1111-4111-8111-111111111111",
            total: 0,
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
      });
    }),
    http.patch(
      `${apiUrl}/api/organizations/acme/projects/:projectId/views/:viewId`,
      async ({ request }) => {
        saved.push(await request.json());

        return HttpResponse.json({ view: { ...personalView, name: "Release watch", revision: 2 } });
      },
    ),
  );
  renderWorkspace(
    `/workspaces/acme/projects/apollo/views/${viewId}?draft=1&priority=high&timeZone=UTC`,
  );

  expect((await screen.findAllByRole("link", { name: "My issues" })).length).toBeGreaterThan(0);
  expect(screen.queryByRole("heading", { name: "My issues" })).not.toBeInTheDocument();
  expect(screen.queryByRole("searchbox", { name: "Search issues" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Add column" })).toBeInTheDocument();
  expect(screen.getAllByText("No issues").length).toBeGreaterThan(0);
  await waitFor(() => {
    expect(issueRequests.some((search) => search.includes("assignee=me"))).toBe(true);
    expect(issueRequests.some((search) => search.includes("priority=high"))).toBe(false);
  });

  const sidebar = document.querySelector("[data-sidebar='sidebar']");

  expect(sidebar).not.toBeNull();
  expect(within(sidebar as HTMLElement).getByRole("link", { name: "My issues" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(
    screen
      .getAllByRole("link", { name: "Views" })
      .some((link) => link.getAttribute("href") === "/workspaces/acme/projects/apollo/views"),
  ).toBe(true);

  await user.click(screen.getByRole("button", { name: "View actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Edit view" }));
  expect(screen.getByLabelText("Name")).toHaveValue("My issues");
  await user.click(screen.getByRole("combobox", { name: "Sharing" }));
  await user.click(await screen.findByRole("option", { name: "Project" }));
  await user.clear(screen.getByLabelText("Name"));
  await user.type(screen.getByLabelText("Name"), "Release watch");
  await user.click(screen.getByRole("button", { name: "Priority" }));
  await user.click(await screen.findByRole("menuitemcheckbox", { name: "High" }));
  await user.click(screen.getByRole("button", { name: "Save changes" }));

  await waitFor(() => {
    expect(saved).toEqual([
      expect.objectContaining({
        definition: {
          filters: {
            assignee: { includeCurrentUser: true, includeUnassigned: false, memberIds: [] },
            priorities: ["high"],
            timeZone: "UTC",
          },
          version: 1,
        },
        expectedRevision: 1,
        name: "Release watch",
        visibility: "project",
      }),
    ]);
  });
});
