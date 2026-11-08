import { useTheme } from "next-themes";

type ActiveTheme = "light" | "dark";

/*
 * Display copy for the resolved theme. Accessible labels and tooltips resolve
 * the theme code through this mapper instead of interpolating `light`/`dark`.
 */
const activeThemeLabels: Record<ActiveTheme, string> = {
  dark: "Dark",
  light: "Light",
};

function getActiveThemeLabel(theme: ActiveTheme): string {
  return activeThemeLabels[theme];
}

function useActiveTheme(): ActiveTheme | undefined {
  const { resolvedTheme } = useTheme();

  /*
   * next-themes resolves the stored theme on the first client render. Return
   * undefined until then instead of assuming light, so the logo does not flash
   * the wrong asset before the provider settles.
   */
  if (resolvedTheme === "dark") {
    return "dark";
  }

  if (resolvedTheme === "light") {
    return "light";
  }

  return undefined;
}

export { getActiveThemeLabel, useActiveTheme, type ActiveTheme };
