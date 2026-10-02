import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowsClockwiseIcon, WarningIcon } from "@phosphor-icons/react";

interface PageErrorProps {
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
}

function PageError({
  description,
  onRetry,
  retryLabel = "Try again",
  title = "Something went wrong",
}: PageErrorProps) {
  return (
    <motion.main
      animate={{ opacity: 1 }}
      className="flex min-h-svh items-center justify-center bg-background p-6"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <WarningIcon aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        {onRetry === undefined ? null : (
          <CardContent>
            <Button className="w-full" onClick={onRetry} variant="outline">
              <ArrowsClockwiseIcon aria-hidden="true" data-icon="inline-start" />
              {retryLabel}
            </Button>
          </CardContent>
        )}
      </Card>
    </motion.main>
  );
}

export { PageError };
