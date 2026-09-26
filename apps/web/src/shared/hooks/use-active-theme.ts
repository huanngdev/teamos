import { useEffect, useState } from "react";
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return undefined;
  }

  return resolvedTheme === "dark" ? "dark" : "light";
}

export { getActiveThemeLabel, useActiveTheme, type ActiveTheme };
