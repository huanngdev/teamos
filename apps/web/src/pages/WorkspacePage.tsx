import { Link, Navigate, useParams } from "react-router";
import { FolderIcon } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { PageLoading } from "@/components/page-loading";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthSession } from "@/hooks/use-auth-session";
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
  const session = useAuthSession();
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
  // Project persistence is not implemented yet, so the projects count stays at zero.
  const projectCount = 0;

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-0">
            <Logo size="2rem" />
            <WorkspaceSwitcher
              currentName={organization.name}
              currentSlug={organization.slug}
              organizations={organizations.organizations}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ModeToggle />
            {session.status === "authenticated" ? (
              <AccountMenu
                isSigningOut={signOut.isPending}
                onSignOut={() => {
                  void signOut.signOut();
                }}
                user={session.user}
              />
            ) : null}
          </div>
        </header>

        <Tabs defaultValue="projects" className="w-full ">
          <TabsList variant="line" className="mb-4 ">
            <TabsTrigger value="projects">
              Projects <Badge variant="secondary">{projectCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="members">
              Members <Badge variant="secondary">{organization.members.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderIcon />
                </EmptyMedia>
                <EmptyTitle>No projects yet</EmptyTitle>
                <EmptyDescription>
                  Projects will appear here once project management is available.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </TabsContent>

          <TabsContent value="members">
            <div className="flex flex-col gap-2">
              {organization.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="truncate text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge className="shrink-0" variant="secondary">
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

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
