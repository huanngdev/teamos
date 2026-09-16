import { CheckCircle2Icon } from "lucide-react";
import { motion } from "framer-motion";

import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const workspaceAreas = ["Projects", "Issues", "Team"] as const;

function HomePage() {
  return (
    <motion.main
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-svh items-center justify-center bg-background p-6"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="w-full max-w-2xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
              T
            </div>
            <div>
              <p className="font-heading text-lg font-medium">TeamOS</p>
              <p className="text-sm text-muted-foreground">Team workspace</p>
            </div>
          </div>
          <ModeToggle />
        </header>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CheckCircle2Icon aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-1">
                  <CardTitle>Workspace ready</CardTitle>
                  <CardDescription>
                    Your frontend foundation is connected to the TeamOS backend.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary">Online</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {workspaceAreas.map((area) => (
                <div key={area} className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-sm font-medium">{area}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Coming next</p>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex w-full items-center justify-between gap-4 text-sm text-muted-foreground">
              <span>Backend services are healthy.</span>
              <span className="hidden sm:inline">Foundation v1</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </motion.main>
  );
}

export { HomePage };
