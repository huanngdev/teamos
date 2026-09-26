import { useParams } from "react-router";

import { IssueBoard } from "@/features/issues/components/issue-board";
import { useIssueBoard } from "@/features/issues/hooks/use-issue-board";
import { useWorkspace } from "@/features/workspaces";

function ProjectIssuesRoute() {
  const { organizationSlug = "", projectSlug = "" } = useParams();
  const workspace = useWorkspace(organizationSlug);
  const board = useIssueBoard({
    enabled: workspace.status === "ready",
    organizationRole: workspace.status === "ready" ? workspace.organization.role : "member",
    organizationSlug,
    projectSlug,
  });

  if (workspace.status !== "ready") {
    return null;
  }

  return <IssueBoard state={board} />;
}

export { ProjectIssuesRoute };
