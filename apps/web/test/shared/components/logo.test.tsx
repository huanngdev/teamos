import { render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";

const themeState = vi.hoisted(() => ({ resolvedTheme: "light" }));

vi.mock("next-themes", () => ({
  useTheme: () => themeState,
}));

import { Logo } from "./logo";

test.each([
  ["light", "/logo-light.svg"],
  ["dark", "/logo-dark.svg"],
] as const)("renders the %s theme logo", async (theme, source) => {
  themeState.resolvedTheme = theme;
  render(<Logo />);

  const logo = screen.getByRole("img", { name: "TeamOS" });

  await waitFor(() => {
    expect(logo).toHaveAttribute("src", source);
  });
});

test("renders only the icon by default", () => {
  render(<Logo data-testid="logo" size={60} />);

  expect(screen.queryByText("TeamOS")).not.toBeInTheDocument();
  expect(screen.getByTestId("logo")).toHaveStyle({ "--logo-size": "60px" });
  expect(screen.getByTestId("logo")).toHaveClass("h-(--logo-size)", "w-(--logo-size)");
});

test("keeps the combined vertical wordmark spacing equal to the horizontal gap", () => {
  render(<Logo data-testid="logo" size={60} variant="wordmark" />);

  expect(screen.getByTestId("logo")).toHaveStyle({ "--logo-size": "60px" });
  expect(screen.getByTestId("logo")).toHaveClass("gap-2");
  expect(screen.getByText("TeamOS")).toHaveClass("logo-wordmark");
});
