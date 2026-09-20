import { canUpdateOrganization, type OrganizationContext } from "@teamos/shared";
import { Navigate, useParams } from "react-router";

import {
  useWorkspace,
  useWorkspaceSettings,
  WorkspaceSettingsPanel,
  workspaceProjectsPath,
} from "@/features/workspaces";

/*
 * The workspace layout owns loading, not-found, and error states, so this route
 * only renders once the workspace is ready. Settings state is initialized from
 * the loaded organization, which is why the ready branch is its own component.
 */
function WorkspaceSettingsContent({ organization }: { organization: OrganizationContext }) {
  const view = useWorkspaceSettings(organization);

  return (
    <div className="mt-3">
      <WorkspaceSettingsPanel view={view} />
    </div>
  );
}

function WorkspaceSettingsRoute() {
  const { organizationSlug } = useParams();
  const workspace = useWorkspace(organizationSlug ?? "");

  if (workspace.status !== "ready") {
    return null;
  }

  /*
   * Members never see the Settings tab. A direct URL is redirected to projects
   * so the screen is not reachable by editing the address bar.
   */
  if (!canUpdateOrganization(workspace.organization.role)) {
    return <Navigate replace to={workspaceProjectsPath(workspace.organization.slug)} />;
  }

  return (
    <WorkspaceSettingsContent
      key={workspace.organization.slug}
      organization={workspace.organization}
    />
  );
}

export { WorkspaceSettingsRoute };
