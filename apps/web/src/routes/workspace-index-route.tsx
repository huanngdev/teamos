import { Link, Navigate } from "react-router";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useWorkspaceDestination } from "@/features/workspaces";
import { PageLoading } from "@/shared";

/*
 * `/` resolves the workspace to open: the remembered workspace while the user
 * still belongs to it, otherwise the newest one, otherwise workspace creation.
 */
function WorkspaceIndexRoute() {
  const destination = useWorkspaceDestination();

  if (destination.status === "loading") {
    return <PageLoading label="Loading your workspaces" />;
  }

  if (destination.status === "error") {
    return (
      <AuthCard description="We could not list your workspaces." title="Workspaces unavailable">
        <div className="flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertDescription>{destination.message}</AlertDescription>
          </Alert>
          <div className="flex flex-col gap-2">
            <button
              className={buttonVariants({ className: "w-full" })}
              onClick={destination.retry}
              type="button"
            >
              Try again
            </button>
            <Link
              className={buttonVariants({ className: "w-full", variant: "outline" })}
              to="/login"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthCard>
    );
  }

  return <Navigate replace to={destination.path} />;
}

export { WorkspaceIndexRoute };
