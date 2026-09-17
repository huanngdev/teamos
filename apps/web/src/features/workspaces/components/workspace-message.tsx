import { Link } from "react-router";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceDestination } from "../hooks/use-workspace-destination";

interface WorkspaceMessageProps {
  description: string;
  title: string;
}

/*
 * Terminal workspace state (missing, unavailable) with a safe way back. The
 * link targets the resolved workspace instead of a hard-coded route so it keeps
 * working once the user's recent workspace is known.
 */
function WorkspaceMessage({ description, title }: WorkspaceMessageProps) {
  const destination = useWorkspaceDestination();
  const backPath = destination.status === "ready" ? destination.path : "/";

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            className={buttonVariants({ className: "w-full", variant: "outline" })}
            to={backPath}
          >
            Back to your workspaces
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

export { WorkspaceMessage };
