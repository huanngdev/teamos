import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

type ActiveTheme = "light" | "dark";

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

export { useActiveTheme, type ActiveTheme };
