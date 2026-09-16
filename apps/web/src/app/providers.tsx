import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { PropsWithChildren } from "react";
import { MotionConfig } from "framer-motion";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { queryClient } from "@/lib/query-client";
import { QueryClientProvider } from "@tanstack/react-query";

function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            {children}
            <Toaster position="top-right" richColors />
            {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
          </TooltipProvider>
        </QueryClientProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}

export { AppProviders };
