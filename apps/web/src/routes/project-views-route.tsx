import { useParams } from "react-router";

import { IssueViewList } from "@/features/views/components/issue-view-list";
import { useIssueViewList } from "@/features/views/hooks/use-issue-view-list";
import { useWorkspace } from "@/features/workspaces";

function ProjectViewsRoute() {
  const { organizationSlug = "", projectSlug = "" } = useParams();
  const workspace = useWorkspace(organizationSlug);
  const views = useIssueViewList({
    enabled: workspace.status === "ready",
    organizationRole: workspace.status === "ready" ? workspace.organization.role : "member",
    organizationSlug,
    projectSlug,
  });

  if (workspace.status !== "ready") {
    return null;
  }

  return <IssueViewList state={views} />;
}

export { ProjectViewsRoute };
