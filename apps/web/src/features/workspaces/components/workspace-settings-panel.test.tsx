// @vitest-environment jsdom

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { apiUrl } from "@/shared";
import {
  organizationContext,
  renderWorkspace,
  useWorkspaceHandlers,
} from "@/test/workspace-fixtures";
import { server } from "@/test/server";

test("renames the workspace and updates the switcher", async () => {
  const requests: unknown[] = [];

  useWorkspaceHandlers();
  server.use(
    http.patch(`${apiUrl}/api/organizations/acme`, async ({ request }) => {
      requests.push(await request.json());

      return HttpResponse.json(organizationContext("owner", { name: "Engines II" }));
    }),
  );

  renderWorkspace("/workspaces/acme/settings");

  const input = await screen.findByLabelText("Name");
  const save = screen.getByRole("button", { name: "Save changes" });

  expect(save).toBeDisabled();

  await userEvent.clear(input);
  await userEvent.type(input, "  Engines II  ");

  expect(save).toBeEnabled();

  await userEvent.click(save);

  await waitFor(() => {
    expect(requests).toEqual([{ name: "Engines II" }]);
  });

  expect(
    await screen.findByRole("button", {
      name: "Switch workspace, current workspace Engines II",
    }),
  ).toBeInTheDocument();
});

test("keeps the draft and reports a failed rename", async () => {
  useWorkspaceHandlers();
  server.use(
    http.patch(`${apiUrl}/api/organizations/acme`, () =>
      HttpResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Forbidden",
            requestId: "request-1",
          },
        },
        { status: 403 },
      ),
    ),
  );

  renderWorkspace("/workspaces/acme/settings");

  const input = await screen.findByLabelText("Name");

  await userEvent.clear(input);
  await userEvent.type(input, "Engines II");
  await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

  expect(
    await screen.findByText("You are not allowed to rename this workspace."),
  ).toBeInTheDocument();
  expect(input).toHaveValue("Engines II");
  expect(
    screen.getByRole("button", { name: "Switch workspace, current workspace Analytical Engines" }),
  ).toBeInTheDocument();
});

test("shows rename to an admin but not the danger zone", async () => {
  useWorkspaceHandlers({ role: "admin" });
  renderWorkspace("/workspaces/acme/settings");

  expect(await screen.findByRole("button", { name: "Save changes" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete workspace" })).not.toBeInTheDocument();
});

test("redirects a member away from settings and hides the tab", async () => {
  useWorkspaceHandlers({ role: "member" });
  renderWorkspace("/workspaces/acme/settings");

  expect(await screen.findByRole("heading", { name: "Apollo" })).toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: "Settings" })).not.toBeInTheDocument();
});

test("requires the exact workspace name before deleting", async () => {
  const deleted: string[] = [];
  const organizations = [
    {
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "org-1",
      logo: null,
      metadata: null,
      name: "Analytical Engines",
      slug: "acme",
    },
    {
      createdAt: "2025-12-01T00:00:00.000Z",
      id: "org-2",
      logo: null,
      metadata: null,
      name: "Difference Engine",
      slug: "difference",
    },
  ];

  useWorkspaceHandlers();
  server.use(
    http.get(`${apiUrl}/api/auth/organization/list`, () =>
      HttpResponse.json(
        organizations.filter(
          (organization) => !(organization.slug === "acme" && deleted.length > 0),
        ),
      ),
    ),
    http.delete(`${apiUrl}/api/organizations/acme`, () => {
      deleted.push("acme");

      return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${apiUrl}/api/organizations/difference`, () =>
      HttpResponse.json({
        organization: {
          createdAt: "2025-12-01T00:00:00.000Z",
          id: "org-2",
          logo: null,
          memberCount: 1,
          name: "Difference Engine",
          role: "owner",
          slug: "difference",
        },
      }),
    ),
    http.get(`${apiUrl}/api/organizations/difference/projects`, () =>
      HttpResponse.json({ projects: [] }),
    ),
  );

  renderWorkspace("/workspaces/acme/settings");

  await userEvent.click(await screen.findByRole("button", { name: "Delete workspace" }));

  const dialog = await screen.findByRole("alertdialog");
  const confirm = within(dialog).getByRole("button", { name: "Delete workspace" });
  const confirmation = within(dialog).getByLabelText("Type Analytical Engines to confirm");

  expect(confirm).toBeDisabled();

  await userEvent.type(confirmation, "analytical engines");
  expect(confirm).toBeDisabled();

  await userEvent.clear(confirmation);
  await userEvent.type(confirmation, "Analytical Engines");
  expect(confirm).toBeEnabled();

  await userEvent.click(confirm);

  await waitFor(() => {
    expect(deleted).toEqual(["acme"]);
  });

  expect(
    await screen.findByRole("button", {
      name: "Switch workspace, current workspace Difference Engine",
    }),
  ).toBeInTheDocument();
});

test("keeps the delete dialog open and shows an error on failure", async () => {
  useWorkspaceHandlers();
  server.use(
    http.delete(`${apiUrl}/api/organizations/acme`, () =>
      HttpResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Forbidden",
            requestId: "request-1",
          },
        },
        { status: 403 },
      ),
    ),
  );

  renderWorkspace("/workspaces/acme/settings");

  await userEvent.click(await screen.findByRole("button", { name: "Delete workspace" }));

  const dialog = await screen.findByRole("alertdialog");
  const confirm = within(dialog).getByRole("button", { name: "Delete workspace" });
  const confirmation = within(dialog).getByLabelText("Type Analytical Engines to confirm");

  await userEvent.type(confirmation, "Analytical Engines");
  await userEvent.click(confirm);

  expect(
    await screen.findByText("You are not allowed to delete this workspace."),
  ).toBeInTheDocument();
  expect(confirmation).toHaveValue("Analytical Engines");
});
