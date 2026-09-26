import { Outlet } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
    <SidebarProvider>
      <ProjectSidebar view={view} />
      <SidebarInset>
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
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
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
