import { useParams } from "react-router";

import { IssueViewBoard } from "@/features/views/components/issue-view-board";
import { useIssueViewBoard } from "@/features/views/hooks/use-issue-view-board";
import { useWorkspace } from "@/features/workspaces";

function ProjectViewRoute() {
  const { organizationSlug = "", projectSlug = "", viewId = "" } = useParams();
  const workspace = useWorkspace(organizationSlug);
  const board = useIssueViewBoard({
    enabled: workspace.status === "ready",
    organizationRole: workspace.status === "ready" ? workspace.organization.role : "member",
    organizationSlug,
    projectSlug,
    viewId,
  });

  if (workspace.status !== "ready") {
    return null;
  }

  return <IssueViewBoard state={board} />;
}

export { ProjectViewRoute };
