import { Link, Navigate } from "react-router";

import { AuthCard } from "@/components/auth-card";
import { PageLoading } from "@/components/page-loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { useOrganizations } from "@/hooks/use-organizations";

function WorkspaceIndexPage() {
  const { errorMessage, isPending, organizations } = useOrganizations();

  if (isPending) {
    return <PageLoading label="Loading your workspaces" />;
  }

  if (errorMessage !== null) {
    return (
      <AuthCard description="We could not list your workspaces." title="Workspaces unavailable">
        <div className="flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          <Link className={buttonVariants({ className: "w-full" })} to="/login">
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  const firstOrganization = organizations[0];

  if (firstOrganization === undefined) {
    return <Navigate replace to="/new-workspace" />;
  }

  return <Navigate replace to={`/${firstOrganization.slug}`} />;
}

export { WorkspaceIndexPage };
