import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const themes = vi.hoisted(() => ({ resolvedTheme: undefined as string | undefined }));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: themes.resolvedTheme }),
}));

import { useActiveTheme } from "@/shared/hooks/use-active-theme";

beforeEach(() => {
  themes.resolvedTheme = undefined;
});

test("stays undefined until next-themes resolves a theme", () => {
  const { result } = renderHook(() => useActiveTheme());

  expect(result.current).toBeUndefined();
});

test("maps the resolved theme without a mount effect", () => {
  themes.resolvedTheme = "dark";
  const { result } = renderHook(() => useActiveTheme());

  expect(result.current).toBe("dark");
});

test("follows a theme change on the next render", () => {
  themes.resolvedTheme = "light";
  const { rerender, result } = renderHook(() => useActiveTheme());

  expect(result.current).toBe("light");

  themes.resolvedTheme = "dark";
  act(() => {
    rerender();
  });
  expect(result.current).toBe("dark");
});
