import type { OrganizationRole, ProjectSummary } from "@teamos/shared";
import { Navigate, useParams } from "react-router";

import {
  ProjectSettingsPanel,
  ProjectSettingsStatus,
} from "@/features/projects/components/project-settings-panel";
import {
  useProjectSettings,
  useProjectSettingsForm,
} from "@/features/projects/hooks/use-project-settings";
import { useWorkspace } from "@/features/workspaces";

interface ProjectSettingsContentProps {
  organizationRole: OrganizationRole;
  organizationSlug: string;
  project: ProjectSummary;
}

function ProjectSettingsContent({
  organizationRole,
  organizationSlug,
  project,
}: ProjectSettingsContentProps) {
  const view = useProjectSettingsForm({ organizationRole, organizationSlug, project });

  return <ProjectSettingsPanel view={view} />;
}

function ProjectSettingsRoute() {
  const { organizationSlug = "", projectSlug = "" } = useParams();
  const workspace = useWorkspace(organizationSlug);
  const settings = useProjectSettings({
    enabled: workspace.status === "ready",
    organizationRole: workspace.status === "ready" ? workspace.organization.role : "member",
    organizationSlug,
    projectSlug,
  });

  if (workspace.status !== "ready") {
    return null;
  }

  if (settings.status === "redirect") {
    return <Navigate replace to={settings.to} />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-4">
      {settings.status === "ready" ? (
        <ProjectSettingsContent
          key={settings.project.id}
          organizationRole={settings.organizationRole}
          organizationSlug={organizationSlug}
          project={settings.project}
        />
      ) : (
        <ProjectSettingsStatus state={settings} />
      )}
    </div>
  );
}

export { ProjectSettingsRoute };
