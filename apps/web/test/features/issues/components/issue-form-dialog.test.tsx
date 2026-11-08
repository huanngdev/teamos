import type { IssueCardSummary } from "@teamos/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { apiUrl } from "@/shared";
import { useEligibleAssignees } from "@/features/projects";
import { server } from "@/test/server";
import { renderWithProviders } from "@/test/render-app";
import {
  boardStatuses,
  projectResponse,
  renderWorkspace,
  useWorkspaceHandlers,
} from "@/test/workspace-fixtures";
import { IssueFormDialog } from "./issue-form-dialog";
import { useIssueForm } from "../hooks/use-issue-form";

const projectId = projectResponse.projects[0].id;
const backlogId = "11111111-1111-4111-8111-111111111111";

test("lists a workspace member who has no project role in the issue assignee sheet", async () => {
  const user = userEvent.setup();
  const created: unknown[] = [];

  useWorkspaceHandlers();
  server.use(
    http.post(
      `${apiUrl}/api/organizations/acme/projects/:projectId/issues`,
      async ({ request }) => {
        created.push(await request.json());

        return HttpResponse.json({ message: "The issue could not be created." }, { status: 422 });
      },
    ),
  );
  renderWorkspace("/w/acme/p/apollo/issues");

  await user.click(await screen.findByRole("button", { name: "New issue" }));
  const dialog = await screen.findByRole("dialog", { name: "New issue" });

  expect(within(dialog).queryByLabelText("Description")).not.toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "Create issue" })).toBeDisabled();

  await user.click(within(dialog).getByRole("button", { name: /Assignee/ }));
  expect(await screen.findByRole("option", { name: "Grace Hopper" })).toBeInTheDocument();
  expect(screen.queryByText("grace@example.com")).not.toBeInTheDocument();
  expect(screen.getByRole("option", { name: "No assignee" })).toBeInTheDocument();
  expect(screen.queryByText("Invite and assign...")).not.toBeInTheDocument();
  expect(screen.getByPlaceholderText("Assign to...")).toBeInTheDocument();

  await user.click(screen.getByRole("option", { name: "Grace Hopper" }));
  expect(screen.getByRole("option", { name: "Grace Hopper" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await user.click(screen.getByRole("option", { name: "Ada Lovelace" }));
  await user.keyboard("{Escape}");
  await user.type(within(dialog).getByLabelText("Issue title"), "Gate review");
  await user.click(within(dialog).getByRole("button", { name: "Create issue" }));

  await waitFor(() => {
    expect(created).toEqual([
      expect.objectContaining({
        assigneeMemberIds: ["member-3", "member-1"],
        title: "Gate review",
      }),
    ]);
  });
  expect(within(dialog).getByLabelText("Issue title")).toHaveValue("Gate review");
  expect(within(dialog).getByText("Issue not saved")).toBeInTheDocument();
});

test("quick edit saves title and metadata without replacing content", async () => {
  const user = userEvent.setup();
  const updates: unknown[] = [];
  let detailRequests = 0;
  const card: IssueCardSummary = {
    assignees: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "card-1",
    number: "7",
    position: 1000,
    priority: "none",
    statusId: backlogId,
    title: "Partial card",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
  const saved = {
    ...card,
    content: null,
    contentText: "Keep the flight notes",
    title: "Updated card",
  };

  useWorkspaceHandlers();
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issues/:issueId`, () => {
      detailRequests += 1;

      return HttpResponse.json({ issue: saved });
    }),
    http.patch(
      `${apiUrl}/api/organizations/acme/projects/:projectId/issues/:issueId`,
      async ({ request }) => {
        updates.push(await request.json());

        return HttpResponse.json({ issue: saved });
      },
    ),
  );

  function Harness() {
    const form = useIssueForm({
      canUpdateIssue: true,
      organizationSlug: "acme",
      projectId,
      statuses: boardStatuses.statuses,
    });
    const assignees = useEligibleAssignees({
      enabled: true,
      organizationSlug: "acme",
      projectId,
    });

    return (
      <>
        <button onClick={() => form.openEdit(card)} type="button">
          Open card
        </button>
        <IssueFormDialog assignees={assignees} form={form} statuses={boardStatuses.statuses} />
      </>
    );
  }

  renderWithProviders(<Harness />);
  await user.click(screen.getByRole("button", { name: "Open card" }));

  const dialog = await screen.findByRole("dialog", { name: "Edit issue" });

  expect(within(dialog).queryByLabelText("Description")).not.toBeInTheDocument();
  expect(within(dialog).getByLabelText("Issue title")).toHaveValue("Partial card");
  expect(within(dialog).getByRole("button", { name: "Save issue" })).toBeEnabled();

  await user.clear(within(dialog).getByLabelText("Issue title"));
  await user.type(within(dialog).getByLabelText("Issue title"), "Updated card");
  await user.click(within(dialog).getByRole("button", { name: "Save issue" }));

  await waitFor(() => {
    expect(updates).toEqual([
      {
        assigneeMemberIds: [],
        expectedUpdatedAt: "2026-01-02T00:00:00.000Z",
        priority: "none",
        statusId: backlogId,
        title: "Updated card",
      },
    ]);
  });
  expect(updates[0]).not.toHaveProperty("content");
  expect(detailRequests).toBe(0);
});
