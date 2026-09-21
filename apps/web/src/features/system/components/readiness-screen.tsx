import { CheckCircle2Icon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { motion } from "framer-motion";

import type { BackendReadinessState } from "../hooks/use-backend-readiness";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getReadinessDependencyStatusLabel } from "../lib/readiness-labels";

const dependencyLabels = [
  { key: "database", label: "Database" },
  { key: "redis", label: "Redis" },
  { key: "storage", label: "Object storage" },
] as const;

type ReadinessScreenState = Extract<BackendReadinessState, { status: "error" | "loading" }>;

type ReadinessScreenProps = {
  onRetry: () => void;
  state: ReadinessScreenState;
};

function ReadinessScreen({ onRetry, state }: ReadinessScreenProps) {
  if (state.status === "loading") {
    return (
      <motion.main
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-svh items-center justify-center bg-background p-6"
        initial={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Connecting to TeamOS</CardTitle>
            <CardDescription>
              Checking the backend services before opening your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Spinner aria-label="Checking backend services" />
            </div>
          </CardContent>
        </Card>
      </motion.main>
    );
  }

  return (
    <motion.main
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-svh items-center justify-center bg-background p-6"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <TriangleAlertIcon aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle>Backend not ready</CardTitle>
              <CardDescription>{state.errorMessage}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Alert variant="destructive">
              <TriangleAlertIcon aria-hidden="true" />
              <AlertTitle>Workspace access is paused</AlertTitle>
              <AlertDescription>
                All required services must be available before TeamOS can load.
              </AlertDescription>
            </Alert>
            {state.readiness ? (
              <div className="flex flex-col gap-2" aria-label="Backend dependency status">
                {dependencyLabels.map((dependency) => {
                  const status = state.readiness?.dependencies[dependency.key].status;

                  if (status === undefined) {
                    return null;
                  }

                  const isReady = status === "ok";

                  return (
                    <div
                      key={dependency.key}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span>{dependency.label}</span>
                      <Badge variant={isReady ? "secondary" : "destructive"}>
                        {isReady ? <CheckCircle2Icon data-icon="inline-start" /> : null}
                        {getReadinessDependencyStatusLabel(status)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={state.isRetrying}
            onClick={onRetry}
          >
            {state.isRetrying ? (
              <Spinner data-icon="inline-start" aria-hidden="true" />
            ) : (
              <RefreshCwIcon data-icon="inline-start" />
            )}
            {state.isRetrying ? "Retrying" : "Try again"}
          </Button>
        </CardFooter>
      </Card>
    </motion.main>
  );
}

export { ReadinessScreen };
