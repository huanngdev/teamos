import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { Logo } from "@/shared/components/logo";
import { ModeToggle } from "@/shared/components/mode-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCardProps {
  children: ReactNode;
  description: string;
  title: string;
}

function AuthCard({ children, description, title }: AuthCardProps) {
  return (
    <motion.main
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-svh items-center justify-center bg-background p-6"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="w-full max-w-md">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="2.25rem" variant="wordmark" />
          </div>
          <ModeToggle />
        </header>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </motion.main>
  );
}

export { AuthCard };
