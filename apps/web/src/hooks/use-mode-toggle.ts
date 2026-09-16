import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

function useModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeTheme: "light" | "dark" | undefined = isMounted
    ? resolvedTheme === "dark"
      ? "dark"
      : "light"
    : undefined;
  const toggleTheme = () => {
    setTheme(activeTheme === "dark" ? "light" : "dark");
  };

  return { activeTheme, toggleTheme };
}

export { useModeToggle };
