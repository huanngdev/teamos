import type { IssueCardSummary, IssueSummary } from "@teamos/shared";
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
  renderWorkspace("/workspaces/acme/projects/apollo/issues");

  await user.click(await screen.findByRole("button", { name: "New issue" }));
  const dialog = await screen.findByRole("dialog", { name: "New issue" });

  expect(within(dialog).getByLabelText("Description")).toBeEnabled();
  expect(within(dialog).getByRole("button", { name: "Create issue" })).toBeDisabled();

  await user.click(within(dialog).getByRole("button", { name: "Assignee" }));
  expect(await screen.findByRole("button", { name: /Grace Hopper/ })).toBeInTheDocument();
  expect(screen.getByText("grace@example.com")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Unassigned" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /Grace Hopper/ }));
  await user.type(within(dialog).getByLabelText("Title"), "Gate review");
  await user.click(within(dialog).getByRole("button", { name: "Create issue" }));

  await waitFor(() => {
    expect(created).toEqual([
      expect.objectContaining({ assigneeMemberId: "member-3", title: "Gate review" }),
    ]);
  });
  expect(within(dialog).getByLabelText("Title")).toHaveValue("Gate review");
  expect(within(dialog).getByText("Issue not saved")).toBeInTheDocument();
});

test("does not save an edit until the issue detail has loaded", async () => {
  const user = userEvent.setup();
  const updates: unknown[] = [];
  let releaseDetail: (() => void) | undefined;
  const detailGate = new Promise<void>((resolve) => {
    releaseDetail = resolve;
  });
  const card: IssueCardSummary = {
    assignee: null,
    assigneeMemberId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "card-1",
    number: 7,
    position: 1000,
    priority: "none",
    statusId: backlogId,
    title: "Partial card",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
  const detail: IssueSummary = {
    ...card,
    description: "Keep the flight notes",
    updatedAt: "2026-01-03T00:00:00.000Z",
  };

  useWorkspaceHandlers();
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/:projectId/issues/:issueId`, async () => {
      await detailGate;

      return HttpResponse.json({ issue: detail });
    }),
    http.patch(
      `${apiUrl}/api/organizations/acme/projects/:projectId/issues/:issueId`,
      async ({ request }) => {
        updates.push(await request.json());

        return HttpResponse.json({ issue: detail });
      },
    ),
  );

  function Harness() {
    const form = useIssueForm({
      canDeleteIssue: true,
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
  const description = within(dialog).getByLabelText("Description");

  expect(description).toHaveValue("");
  expect(description).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "Save issue" })).toBeDisabled();

  await user.click(within(dialog).getByRole("button", { name: "Save issue" }));
  expect(updates).toEqual([]);

  releaseDetail?.();

  await waitFor(() => {
    expect(description).toHaveValue("Keep the flight notes");
  });
  expect(description).toBeEnabled();
  expect(within(dialog).getByRole("button", { name: "Save issue" })).toBeEnabled();
  expect(updates).toEqual([]);
});
