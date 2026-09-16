// @vitest-environment jsdom

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import type { OrganizationSummary } from "@teamos/shared";

import { apiUrl } from "@/lib/env";
import { createTestQueryClient, renderWithProviders } from "@/test/render-app";
import { server } from "@/test/server";

import { ORGANIZATIONS_QUERY_KEY } from "./use-organizations";
import { useCreateWorkspace } from "./use-create-workspace";

const createdOrganization = {
  createdAt: "2026-01-02T00:00:00.000Z",
  id: "org-2",
  logo: null,
  metadata: null,
  name: "Acme Inc.",
  slug: "acme-inc",
} as const;

const createdSummary: OrganizationSummary = {
  id: "org-2",
  logo: null,
  name: "Acme Inc.",
  slug: "acme-inc",
};

function CreateWorkspaceHarness() {
  const { errorMessage, submitWorkspace } = useCreateWorkspace();

  return (
    <div>
      <button
        onClick={() => {
          void submitWorkspace("Acme Inc.");
        }}
        type="button"
      >
        Create
      </button>
      <p>{errorMessage}</p>
    </div>
  );
}

function renderHarness(queryClient = createTestQueryClient()) {
  renderWithProviders(<CreateWorkspaceHarness />, { queryClient });

  return queryClient;
}

function availableSlug() {
  return HttpResponse.json({ status: true });
}

test("adds the created workspace to the cached organization list", async () => {
  const queryClient = renderHarness();
  queryClient.setQueryData<OrganizationSummary[]>(ORGANIZATIONS_QUERY_KEY, []);

  server.use(
    http.post(`${apiUrl}/api/auth/organization/check-slug`, availableSlug),
    http.post(`${apiUrl}/api/auth/organization/create`, () =>
      HttpResponse.json(createdOrganization),
    ),
  );

  await userEvent.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(queryClient.getQueryData<OrganizationSummary[]>(ORGANIZATIONS_QUERY_KEY)).toEqual([
      createdSummary,
    ]);
  });
});

test("retries with a suffixed slug when the base slug is taken", async () => {
  renderHarness();

  let checkCount = 0;
  let createdSlug: string | null = null;

  server.use(
    http.post(`${apiUrl}/api/auth/organization/check-slug`, () => {
      checkCount += 1;

      return checkCount === 1
        ? HttpResponse.json(
            {
              code: "ORGANIZATION_SLUG_ALREADY_TAKEN",
              message: "Organization slug already taken",
            },
            { status: 400 },
          )
        : availableSlug();
    }),
    http.post(`${apiUrl}/api/auth/organization/create`, async ({ request }) => {
      const body = (await request.json()) as { slug?: string };
      createdSlug = body.slug ?? null;

      return HttpResponse.json(createdOrganization);
    }),
  );

  await userEvent.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(createdSlug).not.toBeNull();
  });
  expect(createdSlug).toMatch(/^acme-inc-[0-9a-f]{4}$/);
  expect(checkCount).toBe(2);
});

test("reports the workspace limit without creating a workspace", async () => {
  renderHarness();

  let createCount = 0;

  server.use(
    http.post(`${apiUrl}/api/auth/organization/check-slug`, availableSlug),
    http.post(`${apiUrl}/api/auth/organization/create`, () => {
      createCount += 1;

      return HttpResponse.json(
        {
          code: "YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS",
          message: "You have reached the maximum number of organizations",
        },
        { status: 403 },
      );
    }),
  );

  await userEvent.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByText("You have reached the maximum number of workspaces for this account."),
  ).toBeInTheDocument();
  expect(createCount).toBe(1);
});
