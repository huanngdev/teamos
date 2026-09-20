// @vitest-environment jsdom

import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderWithProviders } from "@/test/render-app";

import { AuthProviderButtons } from "./auth-provider-buttons";

const providers = [
  { enabled: true, id: "google", name: "Google" },
  { enabled: true, id: "github", name: "GitHub" },
] as const;

test("renders the provider icon inside each sign-in button", () => {
  renderWithProviders(
    <AuthProviderButtons onSelect={() => undefined} pendingProvider={null} providers={providers} />,
  );

  const googleButton = screen.getByRole("button", { name: "Continue with Google" });
  const githubButton = screen.getByRole("button", { name: "Continue with GitHub" });

  expect(googleButton.querySelector("img")).toHaveAttribute("src", "/logo/google-icon.svg");
  expect(githubButton.querySelector("img")).toHaveAttribute("src", "/logo/github-icon.svg");
});

test("replaces the pending provider icon with a spinner", () => {
  renderWithProviders(
    <AuthProviderButtons
      onSelect={() => undefined}
      pendingProvider="google"
      providers={providers}
    />,
  );

  const googleButton = screen.getByRole("button", { name: /Continue with Google/ });
  const githubButton = screen.getByRole("button", { name: /Continue with GitHub/ });

  expect(googleButton.querySelector("img")).toBeNull();
  expect(within(googleButton).getByRole("status")).toBeInTheDocument();
  expect(githubButton.querySelector("img")).toHaveAttribute("src", "/logo/github-icon.svg");
});
