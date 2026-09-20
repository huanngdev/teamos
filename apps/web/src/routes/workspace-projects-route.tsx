import { useProjects } from "@/features/projects/hooks/use-projects";
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog";
import { ProjectMembersDialog } from "@/features/projects/components/project-members-dialog";
import { ProjectsPanel } from "@/features/projects/components/projects-panel";
import { useCreateProjectForm } from "@/features/projects/hooks/use-create-project-form";
import { useWorkspace } from "@/features/workspaces";
import { useParams } from "react-router";
import { useState } from "react";

function WorkspaceProjectsRoute() {
  const { organizationSlug } = useParams();
  const workspace = useWorkspace(organizationSlug ?? "");
  const role = workspace.status === "ready" ? workspace.organization.role : "member";
  const projects = useProjects({
    enabled: workspace.status === "ready",
    organizationRole: role,
    organizationSlug: organizationSlug ?? "",
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createProjectForm = useCreateProjectForm({
    /* The form clears itself on success, so only the dialog needs closing. */
    onCreated: () => {
      setIsCreateOpen(false);
    },
    organizationSlug: organizationSlug ?? "",
  });

  return (
    <>
      <div className="mt-3">
        <ProjectsPanel
          onCreateProject={() => {
            setIsCreateOpen(true);
          }}
          onManageMembers={(project) => {
            projects.openMembers(project.id);
          }}
          state={projects}
        />
      </div>

      <CreateProjectDialog
        form={createProjectForm}
        onClose={() => {
          setIsCreateOpen(false);
          createProjectForm.reset();
        }}
        open={isCreateOpen}
      />

      <ProjectMembersDialog
        errorMessage={projects.membersError}
        isPending={projects.membersIsPending}
        members={projects.members}
        onClose={projects.closeMembers}
        onRemoveMember={projects.removeMember}
        onRoleChange={projects.changeMemberRole}
        open={projects.selectedProject !== null}
        pendingMemberId={projects.pendingMemberId}
        projectName={projects.selectedProject?.name ?? "Project"}
      />
    </>
  );
}

export { WorkspaceProjectsRoute };
