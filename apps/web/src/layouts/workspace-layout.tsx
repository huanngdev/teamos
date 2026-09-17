import { NavLink, Outlet } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountMenu } from "@/features/auth";
import { WorkspaceMessage, WorkspaceSwitcher } from "@/features/workspaces";
import { useWorkspaceLayout } from "@/layouts/use-workspace-layout";
import { Logo, ModeToggle, PageLoading } from "@/shared";

function WorkspaceLayout() {
  const state = useWorkspaceLayout();

  if (state.status === "loading") {
    return <PageLoading label="Loading workspace" />;
  }

  if (state.status === "not-found") {
    return (
      <WorkspaceMessage
        description="This workspace does not exist or you are not a member of it."
        title="Workspace not found"
      />
    );
  }

  if (state.status === "error") {
    return <WorkspaceMessage description={state.message} title="Workspace unavailable" />;
  }

  const { view } = state;

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:p-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo size="2rem" />
            <WorkspaceSwitcher
              currentName={view.organizationName}
              currentSlug={view.organizationSlug}
              organizations={view.organizations}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ModeToggle />
            <AccountMenu
              isSigningOut={view.isSigningOut}
              onSignOut={view.onSignOut}
              user={view.user}
            />
          </div>
        </header>

        <Tabs
          onValueChange={(value) => {
            /* Base UI reports `any | null`; only real tabs may navigate. */
            if (value === "projects" || value === "members") {
              view.onSelectTab(value);
            }
          }}
          value={view.activeTab}
        >
          <TabsList variant="line">
            <TabsTrigger render={<NavLink to={view.projectsPath} />} value="projects">
              Projects <Badge variant="secondary">{view.projectCount}</Badge>
            </TabsTrigger>
            <TabsTrigger render={<NavLink to={view.membersPath} />} value="members">
              Members <Badge variant="secondary">{view.memberCount}</Badge>
            </TabsTrigger>
            <TabsIndicator />
          </TabsList>
        </Tabs>

        {view.signOutError === null ? null : (
          <Alert variant="destructive">
            <AlertTitle>Sign-out failed</AlertTitle>
            <AlertDescription>{view.signOutError}</AlertDescription>
          </Alert>
        )}

        <Outlet />

        {view.organizationsErrorMessage === null ? null : (
          <Alert variant="destructive">
            <AlertTitle>Workspace list unavailable</AlertTitle>
            <AlertDescription>{view.organizationsErrorMessage}</AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}

export { WorkspaceLayout };
