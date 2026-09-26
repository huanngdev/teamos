/* eslint-disable shadcn/no-arbitrary-values -- viewport height is a fixed calc, not a theme token */
import { Outlet } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SeedIssuesButton } from "@/features/issues";
import { CreateProjectDialog, ProjectSwitcher } from "@/features/projects";
import { ProjectSidebar } from "@/features/projects/components/project-sidebar";
import { WorkspaceMessage, WorkspaceSwitcher } from "@/features/workspaces";
import { useProjectLayout } from "@/layouts/use-project-layout";
import { ModeToggle, PageLoading } from "@/shared";

function ProjectLayout() {
  const state = useProjectLayout();

  if (state.status === "loading") {
    return <PageLoading label="Loading project" />;
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
    <SidebarProvider className="h-svh overflow-hidden">
      <ProjectSidebar view={view} />
      {/*
       * Inset adds m-2 on the top and bottom from md up, so 1rem leaves the
       * viewport. The header is h-12 (3rem). The outlet is what remains.
       */}
      <SidebarInset className="h-screen overflow-hidden md:h-[calc(100vh-1rem)]">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b p-2">
          <SidebarTrigger size="icon" />
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap">
              <BreadcrumbItem className="min-w-0">
                <WorkspaceSwitcher
                  currentName={view.organizationName}
                  currentSlug={view.organizationSlug}
                  organizations={view.organizations}
                />
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                <ProjectSwitcher
                  currentName={view.projectName ?? "Project"}
                  currentSlug={view.projectSlug}
                  onCreate={view.onOpenCreate}
                  organizationSlug={view.organizationSlug}
                  projects={view.projects}
                />
              </BreadcrumbItem>
              {view.pageLabel === null ? null : (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{view.pageLabel}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            {import.meta.env.DEV && view.issuesActive ? <SeedIssuesButton /> : null}
            <ModeToggle />
          </div>
        </header>
        <div className="flex min-w-0 flex-col gap-4 overflow-hidden">
          {view.signOutError === null ? null : (
            <Alert variant="destructive">
              <AlertTitle>Sign-out failed</AlertTitle>
              <AlertDescription>{view.signOutError}</AlertDescription>
            </Alert>
          )}
          <div className="overflow-x-hidden overflow-y-auto h-[calc(100vh-4rem)] ">
            <Outlet />
          </div>
          {view.organizationsErrorMessage === null ? null : (
            <Alert variant="destructive">
              <AlertTitle>Workspace list unavailable</AlertTitle>
              <AlertDescription>{view.organizationsErrorMessage}</AlertDescription>
            </Alert>
          )}
        </div>
        <CreateProjectDialog
          form={view.createForm}
          onClose={view.onCloseCreate}
          open={view.isCreateOpen}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}

export { ProjectLayout };
