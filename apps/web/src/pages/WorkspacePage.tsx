import { Link, Navigate, useParams } from "react-router";
import { LogOutIcon, PlusIcon } from "lucide-react";

import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { PageLoading } from "@/components/page-loading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganizations } from "@/hooks/use-organizations";
import { useSignOut } from "@/hooks/use-sign-out";
import { useWorkspace } from "@/hooks/use-workspace";

interface WorkspaceMessageProps {
  description: string;
  title: string;
}

function WorkspaceMessage({ description, title }: WorkspaceMessageProps) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants({ className: "w-full", variant: "outline" })} to="/">
            Back to your workspaces
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

interface WorkspaceViewProps {
  organizationSlug: string;
}

function WorkspaceView({ organizationSlug }: WorkspaceViewProps) {
  const workspace = useWorkspace(organizationSlug);
  const organizations = useOrganizations();
  const signOut = useSignOut();

  if (workspace.status === "loading") {
    return <PageLoading label="Loading workspace" />;
  }

  if (workspace.status === "not-found") {
    return (
      <WorkspaceMessage
        description="This workspace does not exist or you are not a member of it."
        title="Workspace not found"
      />
    );
  }

  if (workspace.status === "error") {
    return <WorkspaceMessage description={workspace.message} title="Workspace unavailable" />;
  }

  const { organization } = workspace;

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="2.25rem" />
            <div>
              <p className="font-heading text-lg font-medium">{organization.name}</p>
              <p className="text-sm text-muted-foreground">
                /{organization.slug} · {organization.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button
              disabled={signOut.isPending}
              onClick={() => {
                void signOut.signOut();
              }}
              variant="outline"
            >
              <LogOutIcon data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              {organization.members.length} member(s) in this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {organization.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant="secondary">{member.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your workspaces</CardTitle>
            <CardDescription>Switch between the workspaces you belong to.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {organizations.organizations.map((organizationSummary) => (
                <Link
                  key={organizationSummary.id}
                  className={buttonVariants({
                    size: "sm",
                    variant: organizationSummary.slug === organization.slug ? "default" : "outline",
                  })}
                  to={`/${organizationSummary.slug}`}
                >
                  {organizationSummary.name}
                </Link>
              ))}
              <Link
                className={buttonVariants({ size: "sm", variant: "ghost" })}
                to="/new-workspace"
              >
                <PlusIcon data-icon="inline-start" />
                New workspace
              </Link>
            </div>
          </CardContent>
        </Card>

        {organizations.errorMessage === null ? null : (
          <Alert variant="destructive">
            <AlertTitle>Workspace list unavailable</AlertTitle>
            <AlertDescription>{organizations.errorMessage}</AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}

function WorkspacePage() {
  const { organizationSlug } = useParams();

  if (organizationSlug === undefined) {
    return <Navigate replace to="/" />;
  }

  return <WorkspaceView organizationSlug={organizationSlug} />;
}

export { WorkspacePage };
