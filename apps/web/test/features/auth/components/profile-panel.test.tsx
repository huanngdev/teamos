import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Navigate, Route, Routes } from "react-router";
import { expect, test } from "vitest";

import { AccountLayout } from "@/layouts/account-layout";
import { ProfileRoute } from "@/routes/profile-route";
import { apiUrl } from "@/shared";
import { server } from "@/test/server";
import { renderWithProviders } from "@/test/render-app";

const sessionResponse = {
  session: {
    activeOrganizationId: null,
    expiresAt: "2026-01-08T00:00:00.000Z",
    id: "session-1",
  },
  user: {
    email: "ada@example.com",
    emailVerified: true,
    id: "user-1",
    image: null,
    name: "Ada Lovelace",
  },
} as const;

function useProfileHandlers(options: { onUpdate?: (name: string) => void } = {}) {
  server.use(
    http.get(`${apiUrl}/api/me`, () => HttpResponse.json(sessionResponse)),
    http.patch(`${apiUrl}/api/me`, async ({ request }) => {
      const body = (await request.json()) as { name?: unknown };
      const name = typeof body.name === "string" ? body.name : sessionResponse.user.name;

      options.onUpdate?.(name);

      return HttpResponse.json({
        ...sessionResponse,
        user: { ...sessionResponse.user, name },
      });
    }),
  );
}

function renderProfile() {
  return renderWithProviders(
    <Routes>
      <Route element={<AccountLayout />} path="/account">
        <Route element={<Navigate replace to="profile" />} index />
        <Route element={<ProfileRoute />} path="profile" />
      </Route>
    </Routes>,
    { route: "/account/profile" },
  );
}

test("shows the account identity with a read-only email", async () => {
  useProfileHandlers();
  renderProfile();

  expect(await screen.findByText("ada@example.com")).toBeInTheDocument();

  const nameInput = screen.getByLabelText("Display name");
  const emailInput = screen.getByLabelText("Email");

  expect(nameInput).toHaveValue("Ada Lovelace");
  expect(emailInput).toHaveValue("ada@example.com");
  expect(emailInput).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
});

test("resets the draft when cancel is pressed", async () => {
  useProfileHandlers();
  renderProfile();

  const input = await screen.findByLabelText("Display name");

  await userEvent.clear(input);
  await userEvent.type(input, "Ada Byron");

  const cancel = screen.getByRole("button", { name: "Cancel" });

  expect(cancel).toBeEnabled();

  await userEvent.click(cancel);

  expect(input).toHaveValue("Ada Lovelace");
  expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
});

test("saves a trimmed display name and reflects it immediately", async () => {
  const updates: string[] = [];

  useProfileHandlers({ onUpdate: (name) => updates.push(name) });
  renderProfile();

  const input = await screen.findByLabelText("Display name");
  const save = screen.getByRole("button", { name: "Save changes" });

  await userEvent.clear(input);
  await userEvent.type(input, "  Ada Byron  ");

  expect(save).toBeEnabled();

  await userEvent.click(save);

  await waitFor(() => {
    expect(updates).toEqual(["Ada Byron"]);
  });

  expect(await screen.findByText("Ada Byron")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
});

test("offers a profile link in the account menu", async () => {
  useProfileHandlers();
  renderProfile();

  await screen.findByLabelText("Display name");

  await userEvent.click(screen.getByRole("button", { name: "Open account menu" }));

  const profileItem = await screen.findByRole("menuitem", { name: "Profile" });

  expect(profileItem).toHaveAttribute("href", "/account/profile");
});

test("disables save for a whitespace-only name", async () => {
  useProfileHandlers();
  renderProfile();

  const input = await screen.findByLabelText("Display name");

  await userEvent.clear(input);
  await userEvent.type(input, "   ");

  expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
});

test("keeps the draft and reports a failed save", async () => {
  useProfileHandlers();
  server.use(
    http.patch(`${apiUrl}/api/me`, () =>
      HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid",
            requestId: "request-1",
          },
        },
        { status: 422 },
      ),
    ),
  );

  renderProfile();

  const input = await screen.findByLabelText("Display name");

  await userEvent.clear(input);
  await userEvent.type(input, "Ada Byron");
  await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

  expect(
    await screen.findByText("Enter a display name between 1 and 80 characters."),
  ).toBeInTheDocument();
  expect(input).toHaveValue("Ada Byron");
});
