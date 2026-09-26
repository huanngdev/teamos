import { useParams } from "react-router";

import { ProjectOverview } from "@/features/projects/components/project-overview";
import { useProjectOverview } from "@/features/projects/hooks/use-project-overview";
import { useWorkspace } from "@/features/workspaces";

function ProjectOverviewRoute() {
  const { organizationSlug = "", projectSlug = "" } = useParams();
  const workspace = useWorkspace(organizationSlug);
  const overview = useProjectOverview({
    enabled: workspace.status === "ready",
    organizationRole: workspace.status === "ready" ? workspace.organization.role : "member",
    organizationSlug,
    projectSlug,
  });

  if (workspace.status !== "ready") {
    return null;
  }

  return <ProjectOverview state={overview} />;
}

export { ProjectOverviewRoute };
