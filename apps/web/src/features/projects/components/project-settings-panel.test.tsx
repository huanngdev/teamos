import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { apiUrl } from "@/shared";
import { projectResponse, renderWorkspace, useWorkspaceHandlers } from "@/test/workspace-fixtures";
import { server } from "@/test/server";

const projectId = projectResponse.projects[0].id;

test("lets a lead rename the project without exposing delete", async () => {
  const requests: unknown[] = [];
  let projectName = "Apollo";

  useWorkspaceHandlers({ role: "member" });
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects`, () =>
      HttpResponse.json({
        projects: [{ ...projectResponse.projects[0], name: projectName }],
      }),
    ),
    http.patch(`${apiUrl}/api/organizations/acme/projects/${projectId}`, async ({ request }) => {
      const body = await request.json();

      requests.push(body);
      projectName = "Apollo II";

      return HttpResponse.json({
        project: { ...projectResponse.projects[0], name: projectName },
      });
    }),
  );

  renderWorkspace("/workspaces/acme/projects/apollo/settings");

  const name = await screen.findByLabelText("Name");
  const save = screen.getByRole("button", { name: "Save changes" });

  expect(save).toBeDisabled();
  expect(screen.getByLabelText("Slug")).toBeDisabled();
  expect(screen.getByLabelText("Slug")).toHaveValue("apollo");
  expect(screen.getByLabelText("Project visibility")).toHaveTextContent("Private");
  expect(
    screen
      .getAllByRole("link", { name: "Settings" })
      .some((link) => link.getAttribute("href") === "/workspaces/acme/projects/apollo/settings"),
  ).toBe(true);
  expect(screen.queryByRole("button", { name: "Delete project" })).not.toBeInTheDocument();

  await userEvent.clear(name);
  await userEvent.type(name, "  Apollo II  ");

  expect(save).toBeEnabled();

  await userEvent.click(save);

  await waitFor(() => {
    expect(requests).toEqual([{ name: "Apollo II" }]);
  });

  expect(
    await screen.findByRole("button", { name: "Switch project, current project Apollo II" }),
  ).toBeInTheDocument();
});

test("clears a description without sending the slug", async () => {
  const requests: unknown[] = [];

  useWorkspaceHandlers({ role: "member" });
  server.use(
    http.patch(`${apiUrl}/api/organizations/acme/projects/${projectId}`, async ({ request }) => {
      requests.push(await request.json());

      return HttpResponse.json({
        project: { ...projectResponse.projects[0], description: null },
      });
    }),
  );

  renderWorkspace("/workspaces/acme/projects/apollo/settings");

  const description = await screen.findByLabelText("Description");

  await userEvent.clear(description);
  await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

  await waitFor(() => {
    expect(requests).toEqual([{ description: null }]);
  });
});

test("redirects a project member away from settings and hides the item", async () => {
  useWorkspaceHandlers({
    projectPages: () => ({
      projects: [{ ...projectResponse.projects[0], role: "member" }],
    }),
    role: "member",
  });

  renderWorkspace("/workspaces/acme/projects/apollo/settings");

  expect(await screen.findByRole("heading", { name: "Apollo" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
});

test("requires the exact project name before deleting", async () => {
  const requests: unknown[] = [];
  let projects = [...projectResponse.projects];

  useWorkspaceHandlers();
  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects`, () => HttpResponse.json({ projects })),
    http.delete(`${apiUrl}/api/organizations/acme/projects/${projectId}`, async ({ request }) => {
      requests.push(await request.json());
      projects = [];

      return new HttpResponse(null, { status: 204 });
    }),
  );

  renderWorkspace("/workspaces/acme/projects/apollo/settings");

  await userEvent.click(await screen.findByRole("button", { name: "Delete project" }));

  const dialog = await screen.findByRole("alertdialog");
  const confirm = within(dialog).getByRole("button", { name: "Delete project" });
  const confirmation = within(dialog).getByLabelText("Type Apollo to confirm");

  expect(confirm).toBeDisabled();

  await userEvent.type(confirmation, "apollo");
  expect(confirm).toBeDisabled();

  await userEvent.clear(confirmation);
  await userEvent.type(confirmation, "Apollo");
  expect(confirm).toBeEnabled();

  await userEvent.click(confirm);

  await waitFor(() => {
    expect(requests).toEqual([{ confirmationName: "Apollo" }]);
  });

  expect(await screen.findByText("No projects yet")).toBeInTheDocument();
});
