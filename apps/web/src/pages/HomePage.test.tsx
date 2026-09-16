import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { ThemeProvider } from "@/components/theme-provider";

import { HomePage } from "./HomePage";

test("renders the minimal connected workspace home", () => {
  render(
    <ThemeProvider>
      <HomePage />
    </ThemeProvider>,
  );

  expect(screen.getByText("Workspace ready")).toBeInTheDocument();
  expect(screen.getByText("Projects")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
});

test("toggles and persists the selected theme", async () => {
  const user = userEvent.setup();
  localStorage.removeItem("teamos-test-theme");

  render(
    <ThemeProvider defaultTheme="light" storageKey="teamos-test-theme">
      <HomePage />
    </ThemeProvider>,
  );

  const lightModeToggle = screen.getByRole("button", { name: "Switch to dark mode" });
  expect(lightModeToggle).toHaveAttribute("aria-pressed", "false");
  await user.click(lightModeToggle);

  await waitFor(() => {
    expect(document.documentElement).toHaveClass("dark");
  });
  expect(localStorage.getItem("teamos-test-theme")).toBe("dark");

  const darkModeToggle = screen.getByRole("button", { name: "Switch to light mode" });
  expect(darkModeToggle).toHaveAttribute("aria-pressed", "true");
  await user.click(darkModeToggle);

  await waitFor(() => {
    expect(document.documentElement).not.toHaveClass("dark");
  });
  expect(localStorage.getItem("teamos-test-theme")).toBe("light");
});
