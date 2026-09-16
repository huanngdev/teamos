import { AnimatePresence, motion } from "framer-motion";
import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModeToggle } from "@/hooks/use-mode-toggle";

function ModeToggle() {
  const { activeTheme, toggleTheme } = useModeToggle();
  const iconTheme = activeTheme ?? "light";
  const nextTheme = iconTheme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={iconTheme === "dark"}
      onClick={toggleTheme}
      title={`Switch to ${nextTheme} mode`}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={iconTheme}
          aria-hidden="true"
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          className="flex size-4 items-center justify-center"
          exit={{ opacity: 0, rotate: 15, scale: 0.35 }}
          initial={{ opacity: 0, rotate: -15, scale: 0.35 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {iconTheme === "dark" ? <MoonIcon /> : <SunIcon />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

export { ModeToggle };
