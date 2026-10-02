import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { apiUrl } from "@/shared";
import { renderWorkspace, useWorkspaceHandlers } from "@/test/workspace-fixtures";
import { server } from "@/test/server";

test("shows member names, emails, and roles in the members table", async () => {
  useWorkspaceHandlers();
  renderWorkspace("/workspaces/acme/members");

  expect(await screen.findByText("Charles Babbage")).toBeInTheDocument();
  expect(screen.getByText("charles@example.com")).toBeInTheDocument();
  expect(screen.getByText("CB")).toBeInTheDocument();
  expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
    "Member",
    "Role",
    "Actions",
  ]);
});

test("searches members only after the user stops typing", async () => {
  const memberRequests: { search: string | null }[] = [];

  useWorkspaceHandlers({ memberRequests });
  renderWorkspace("/workspaces/acme/members");

  await screen.findByText("Charles Babbage");

  memberRequests.length = 0;
  await userEvent.type(screen.getByLabelText("Search members"), "charles");

  await waitFor(() => {
    expect(memberRequests.some((request) => request.search === "charles")).toBe(true);
  });

  const searchedRequests = memberRequests.filter(
    (request) => request.search !== null && request.search.length > 0,
  );

  expect(searchedRequests).toEqual([{ search: "charles" }]);
});

test("shows an empty result state for a member search with no matches", async () => {
  useWorkspaceHandlers({
    memberPages: () => ({ members: [], pagination: { limit: 25, offset: 0, total: 0 } }),
  });
  renderWorkspace("/workspaces/acme/members");

  const input = await screen.findByLabelText("Search members");

  await userEvent.type(input, "nobody");

  expect(
    await screen.findByText("No members match your search", {}, { timeout: 3000 }),
  ).toBeInTheDocument();
});

test("invites a member and refreshes the pending invitations", async () => {
  const sent: unknown[] = [];
  let invitationsRequestCount = 0;

  useWorkspaceHandlers();
  server.use(
    http.post(`${apiUrl}/api/organizations/acme/invitations`, async ({ request }) => {
      sent.push(await request.json());

      return HttpResponse.json(
        {
          invitation: {
            createdAt: "2026-01-01T00:00:00.000Z",
            email: "new@example.com",
            expiresAt: "2026-01-03T00:00:00.000Z",
            id: "invitation-9",
            inviterId: "user-1",
            role: "member",
            status: "pending",
          },
        },
        { status: 201 },
      );
    }),
    http.get(`${apiUrl}/api/organizations/acme/invitations`, () => {
      invitationsRequestCount += 1;

      return HttpResponse.json({ invitations: [] });
    }),
  );

  renderWorkspace("/workspaces/acme/members");

  await userEvent.click(await screen.findByRole("button", { name: "Invite member" }));

  const dialog = await screen.findByRole("dialog");

  const roleTrigger = within(dialog).getByLabelText("Workspace role");

  expect(roleTrigger).toHaveTextContent("Member");
  expect(roleTrigger).not.toHaveTextContent("member");

  await userEvent.type(within(dialog).getByLabelText("Email address"), "  NEW@Example.com ");
  await userEvent.click(within(dialog).getByRole("button", { name: "Send invitation" }));

  await waitFor(() => {
    expect(sent).toEqual([{ email: "new@example.com", role: "member" }]);
  });

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  expect(invitationsRequestCount).toBeGreaterThan(1);
});

test("lists pending invitations and cancels one from its action menu", async () => {
  let cancelled = 0;

  useWorkspaceHandlers({
    invitations: [
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        email: "invited@example.com",
        expiresAt: "2030-01-03T00:00:00.000Z",
        id: "invitation-1",
        inviterId: "user-1",
        role: "member",
        status: "pending",
      },
    ],
  });
  server.use(
    http.delete(`${apiUrl}/api/organizations/acme/invitations/invitation-1`, () => {
      cancelled += 1;

      return new HttpResponse(null, { status: 204 });
    }),
  );

  renderWorkspace("/workspaces/acme/members");

  expect(await screen.findByText("Pending invitations")).toBeInTheDocument();
  expect(screen.getByText("invited@example.com")).toBeInTheDocument();

  await userEvent.click(
    screen.getByRole("button", { name: "Actions for the invitation to invited@example.com" }),
  );
  await userEvent.click(await screen.findByRole("menuitem", { name: "Cancel invitation" }));
  await userEvent.click(await screen.findByRole("button", { name: "Cancel invitation" }));

  await waitFor(() => {
    expect(cancelled).toBe(1);
  });
});

test("resends a pending invitation from its action menu", async () => {
  let resent = 0;

  useWorkspaceHandlers({
    invitations: [
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        email: "invited@example.com",
        expiresAt: "2030-01-03T00:00:00.000Z",
        id: "invitation-1",
        inviterId: "user-1",
        role: "member",
        status: "pending",
      },
    ],
  });
  server.use(
    http.post(`${apiUrl}/api/organizations/acme/invitations/invitation-1/resend`, () => {
      resent += 1;

      return HttpResponse.json({
        invitation: {
          createdAt: "2026-01-01T00:00:00.000Z",
          email: "invited@example.com",
          expiresAt: "2030-01-03T00:00:00.000Z",
          id: "invitation-1",
          inviterId: "user-1",
          role: "member",
          status: "pending",
        },
      });
    }),
  );

  renderWorkspace("/workspaces/acme/members");

  await screen.findByText("Pending invitations");

  await userEvent.click(
    screen.getByRole("button", { name: "Actions for the invitation to invited@example.com" }),
  );
  await userEvent.click(await screen.findByRole("menuitem", { name: "Resend invitation" }));

  await waitFor(() => {
    expect(resent).toBe(1);
  });
});

test("hides invitation management from an ordinary member", async () => {
  useWorkspaceHandlers({
    invitations: [
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        email: "invited@example.com",
        expiresAt: "2030-01-03T00:00:00.000Z",
        id: "invitation-1",
        inviterId: "user-1",
        role: "member",
        status: "pending",
      },
    ],
    role: "member",
  });
  renderWorkspace("/workspaces/acme/members");

  await screen.findByText("Charles Babbage");

  expect(screen.queryByRole("button", { name: "Invite member" })).not.toBeInTheDocument();
  expect(screen.queryByText("Pending invitations")).not.toBeInTheDocument();
});

test("removes another member after confirmation", async () => {
  let removed = 0;

  useWorkspaceHandlers();
  server.use(
    http.delete(`${apiUrl}/api/organizations/acme/members/member-2`, () => {
      removed += 1;

      return new HttpResponse(null, { status: 204 });
    }),
  );

  renderWorkspace("/workspaces/acme/members");

  await userEvent.click(await screen.findByRole("button", { name: "Actions for Charles Babbage" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Remove from workspace" }));
  await userEvent.click(await screen.findByRole("button", { name: "Remove member" }));

  await waitFor(() => {
    expect(removed).toBe(1);
  });
});

test("offers row actions only for manageable members", async () => {
  useWorkspaceHandlers();
  renderWorkspace("/workspaces/acme/members");

  await screen.findByText("Charles Babbage");

  /*
   * Owners are never managed through generic row actions. Ownership changes use
   * a dedicated transfer flow, and the acting user can never remove themselves
   * from a row action.
   */
  expect(
    screen.queryByRole("button", { name: "Actions for Ada Lovelace" }),
  ).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Actions for Charles Babbage" }));

  expect(await screen.findByRole("menuitem", { name: "Set as admin" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Remove from workspace" })).toBeInTheDocument();
});

test("paginates the member table", async () => {
  useWorkspaceHandlers({
    memberPages: (url) => {
      const offset = Number(url.searchParams.get("offset") ?? "0");

      return {
        members: [
          {
            email: "charles@example.com",
            id: `member-${offset + 2}`,
            image: null,
            name: "Charles Babbage",
            role: "member",
            userId: `user-${offset + 2}`,
          },
        ],
        pagination: { limit: 25, offset, total: 30 },
      };
    },
  });
  renderWorkspace("/workspaces/acme/members");

  expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Next" }));

  expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
});
