import { useTheme } from "next-themes";

import { useActiveTheme } from "@/hooks/use-active-theme";

function useModeToggle() {
  const { setTheme } = useTheme();
  const activeTheme = useActiveTheme();
  const toggleTheme = () => {
    setTheme(activeTheme === "dark" ? "light" : "dark");
  };

  return { activeTheme, toggleTheme };
}

export { useModeToggle };
