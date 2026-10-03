import type { IssueSummary } from "@teamos/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, expect, test, vi } from "vitest";

import { apiUrl } from "@/shared";
import { projectResponse, renderWorkspace, useWorkspaceHandlers } from "@/test/workspace-fixtures";
import { server } from "@/test/server";
import { useBoardStore } from "../stores/board-store";
import { useIssueSelectionStore } from "../stores/issue-selection-store";

const backlogId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  useIssueSelectionStore.setState({ selected: {} });
});

function issue(
  number: number,
  title: string,
  createdAt: string,
  overrides: Partial<IssueSummary> = {},
): IssueSummary {
  return {
    assignees: [],
    createdAt,
    contentText: "",
    id: `issue-${number}`,
    number: String(number),
    position: number,
    priority: "none",
    statusId: backlogId,
    title,
    updatedAt: createdAt,
    ...overrides,
  };
}

function pageIssues(issues: IssueSummary[], params: URLSearchParams) {
  const direction = params.get("direction") === "asc" ? 1 : -1;
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "20");
  const sorted = [...issues].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) * direction || left.id.localeCompare(right.id),
  );
  const start = Math.max(0, page - 1) * pageSize;

  return {
    issues: sorted.slice(start, start + pageSize),
    page,
    pageCount: sorted.length === 0 ? 0 : Math.ceil(sorted.length / pageSize),
    pageSize,
    total: sorted.length,
  };
}

function mockIssues(issues: IssueSummary[]) {
  useBoardStore.getState().clear();
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issues`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      const q = (params.get("q") ?? "").trim().toLowerCase();
      const priority = (params.get("priority") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      const filtered = issues.filter((item) => {
        if (q.length > 0 && !item.title.toLowerCase().includes(q)) {
          return false;
        }

        if (priority.length > 0 && !priority.includes(item.priority)) {
          return false;
        }

        return true;
      });

      return HttpResponse.json(pageIssues(filtered, params));
    }),
  );
}

test("lists issues newest first and links to the board", async () => {
  useWorkspaceHandlers();
  mockIssues([
    issue(1, "Alpha gate", "2026-01-01T12:00:00.000Z"),
    issue(2, "Orbit gate", "2026-06-01T12:00:00.000Z"),
  ]);
  renderWorkspace("/w/acme/p/apollo/issues");

  const titles = await screen.findAllByRole("link", { name: /gate$/ });

  expect(titles.map((link) => link.textContent)).toEqual(["Orbit gate", "Alpha gate"]);
  expect(screen.getByText("I-0002")).toBeInTheDocument();
  expect(screen.queryByText("none")).not.toBeInTheDocument();
  expect(screen.getAllByText("No priority").length).toBeGreaterThan(0);
  expect(
    screen
      .getAllByRole("link", { name: "Board" })
      .some((link) => link.getAttribute("href") === "/w/acme/p/apollo/board"),
  ).toBe(true);
  expect(
    screen
      .getAllByRole("link", { name: "Issues" })
      .some((link) => link.getAttribute("aria-current") === "page"),
  ).toBe(true);
});

test("searches issues from the toolbar", async () => {
  const user = userEvent.setup();

  useWorkspaceHandlers();
  mockIssues([
    issue(1, "Alpha gate", "2026-01-01T12:00:00.000Z"),
    issue(2, "Orbit gate", "2026-06-01T12:00:00.000Z"),
  ]);
  renderWorkspace("/w/acme/p/apollo/issues");

  await screen.findByRole("link", { name: "Alpha gate" });
  await user.type(screen.getByRole("textbox", { name: "Search issues" }), "orbit");

  await waitFor(() => {
    expect(screen.queryByRole("link", { name: "Alpha gate" })).not.toBeInTheDocument();
  });
  expect(screen.getByRole("link", { name: "Orbit gate" })).toBeInTheDocument();
});

test("pages the loaded issues", async () => {
  const user = userEvent.setup();

  useWorkspaceHandlers();
  mockIssues(
    Array.from({ length: 11 }, (_, index) => {
      const number = index + 1;

      return issue(
        number,
        `Issue ${String(number).padStart(2, "0")}`,
        `2026-03-${String(number).padStart(2, "0")}T15:00:00.000Z`,
      );
    }),
  );
  renderWorkspace("/w/acme/p/apollo/issues?pageSize=10");

  expect(await screen.findByRole("link", { name: "Issue 11" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Issue 01" })).not.toBeInTheDocument();
  expect(screen.getByText(/1.10 of 11 rows/)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Next page" }));

  expect(await screen.findByRole("link", { name: "Issue 01" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Issue 11" })).not.toBeInTheDocument();
});

test("applies a priority filter from the URL", async () => {
  let requested = "";

  useWorkspaceHandlers();
  useBoardStore.getState().clear();
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issues`, ({ request }) => {
      requested = new URL(request.url).search;
      const priority = new URL(request.url).searchParams.get("priority");

      return HttpResponse.json(
        pageIssues(
          [issue(2, "Urgent gate", "2026-06-01T12:00:00.000Z", { priority: "urgent" })].filter(
            (item) => priority === null || priority.split(",").includes(item.priority),
          ),
          new URL(request.url).searchParams,
        ),
      );
    }),
  );
  renderWorkspace("/w/acme/p/apollo/issues?priority=urgent");

  expect(await screen.findByRole("link", { name: "Urgent gate" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Quiet gate" })).not.toBeInTheDocument();
  expect(requested).toContain("priority=urgent");
  expect(screen.queryByText("urgent")).not.toBeInTheDocument();
  expect(screen.getByText("Urgent")).toBeInTheDocument();
});

test("deletes selected issues with one request and keeps the selection across pages", async () => {
  const user = userEvent.setup();
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const deleted: string[][] = [];

  useWorkspaceHandlers();
  mockIssues([
    issue(1, "Alpha gate", "2026-01-01T12:00:00.000Z"),
    issue(2, "Orbit gate", "2026-06-01T12:00:00.000Z"),
  ]);
  server.use(
    http.post(
      `${apiUrl}/api/organizations/acme/projects/:projectId/issues/bulk-delete`,
      async ({ request }) => {
        const body = (await request.json()) as { issueIds?: string[] };
        deleted.push(body.issueIds ?? []);

        return new HttpResponse(null, { status: 204 });
      },
    ),
  );
  renderWorkspace("/w/acme/p/apollo/issues?pageSize=1");

  await user.click(await screen.findByRole("checkbox", { name: "Select issue I-0002" }));
  await user.click(screen.getByRole("button", { name: "Next page" }));
  expect(await screen.findByRole("checkbox", { name: "Select issue I-0001" })).not.toBeChecked();
  expect(screen.getByRole("button", { name: "Delete 1 issue" })).toBeInTheDocument();
  await user.click(screen.getByRole("checkbox", { name: "Select issue I-0001" }));
  await user.click(screen.getByRole("button", { name: "Delete 2 issues" }));

  const dialog = await screen.findByRole("alertdialog");

  expect(within(dialog).getByText("Delete 2 issues?")).toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: "Delete issues" }));

  await waitFor(() => {
    expect(deleted).toEqual([["issue-2", "issue-1"]]);
  });
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  log.mockRestore();
});

test("opens an issue and hides creation from a viewer", async () => {
  const user = userEvent.setup();

  useBoardStore.getState().clear();
  useWorkspaceHandlers({
    projectPages: () => ({
      projects: [{ ...projectResponse.projects[0], role: "viewer" }],
    }),
    role: "member",
  });
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issues`, ({ request }) =>
      HttpResponse.json(
        pageIssues(
          [issue(1, "Alpha gate", "2026-01-01T12:00:00.000Z")],
          new URL(request.url).searchParams,
        ),
      ),
    ),
  );
  renderWorkspace("/w/acme/p/apollo/issues");

  expect(await screen.findByRole("link", { name: "Alpha gate" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "New issue" })).not.toBeInTheDocument();

  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issues/by-number/:number`, () =>
      HttpResponse.json({
        issue: { ...issue(1, "Alpha gate", "2026-01-01T12:00:00.000Z"), content: null },
      }),
    ),
  );
  await user.click(screen.getByRole("link", { name: "Alpha gate" }));

  expect(await screen.findByRole("textbox", { name: "Title" })).toBeDisabled();
});

test("highlights a created issue that is on the current page", async () => {
  const user = userEvent.setup();
  const rows = [issue(1, "Alpha gate", "2026-01-01T12:00:00.000Z")];
  const created: unknown[] = [];

  useWorkspaceHandlers();
  mockIssues(rows);
  server.use(
    http.post(
      `${apiUrl}/api/organizations/acme/projects/:projectId/issues`,
      async ({ request }) => {
        created.push(await request.json());
        const saved = issue(2, "Check the gate", "2026-06-02T12:00:00.000Z");
        rows.push(saved);

        return HttpResponse.json(
          { issue: { ...saved, content: null, contentText: "" } },
          { status: 201 },
        );
      },
    ),
  );
  renderWorkspace("/w/acme/p/apollo/issues");

  await user.click(await screen.findByRole("button", { name: "New issue" }));
  const dialog = await screen.findByRole("dialog", { name: "New issue" });

  await user.type(within(dialog).getByLabelText("Issue title"), "Check the gate");
  await user.click(within(dialog).getByRole("button", { name: "Create issue" }));

  expect(await screen.findByText("I-0002 created.")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Search issues" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Check the gate" })).toHaveLength(1);
  expect(document.querySelector('[data-issue-id="issue-2"]')).toHaveClass("bg-accent/60");
  expect(created).toEqual([{ assigneeMemberIds: [], priority: "none", title: "Check the gate" }]);
  expect(created[0]).not.toHaveProperty("content");
});

test("reports a created issue that the current filter hides", async () => {
  const user = userEvent.setup();
  const searches: string[] = [];

  useWorkspaceHandlers();
  useBoardStore.getState().clear();
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issues`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      searches.push(params.toString());

      return HttpResponse.json(pageIssues([], params));
    }),
    http.post(`${apiUrl}/api/organizations/acme/projects/:projectId/issues`, () =>
      HttpResponse.json(
        {
          issue: {
            ...issue(3, "Hidden gate", "2026-06-03T12:00:00.000Z"),
            content: null,
          },
        },
        { status: 201 },
      ),
    ),
  );
  renderWorkspace("/w/acme/p/apollo/issues?priority=high");

  await user.click(await screen.findByRole("button", { name: "New issue" }));
  const dialog = await screen.findByRole("dialog", { name: "New issue" });

  await user.type(within(dialog).getByLabelText("Issue title"), "Hidden gate");
  await user.click(within(dialog).getByRole("button", { name: "Create issue" }));

  expect(
    await screen.findByText("I-0003 was created in Backlog. It is outside the current results."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Hidden gate" })).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Search issues" })).toBeInTheDocument();
  expect(searches.at(-1)).toContain("priority=high");
});

test("shows an empty state when the project has no issues", async () => {
  useBoardStore.getState().clear();
  useWorkspaceHandlers();
  renderWorkspace("/w/acme/p/apollo/issues");

  expect(await screen.findByText("No issues yet")).toBeInTheDocument();
});
