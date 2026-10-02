import { useParams } from "react-router";

import { IssueTablePanel } from "@/features/issues/components/issue-table-panel";
import { useIssueTable } from "@/features/issues/hooks/use-issue-table";
import { useWorkspace } from "@/features/workspaces";

function ProjectIssuesRoute() {
  const { organizationSlug = "", projectSlug = "" } = useParams();
  const workspace = useWorkspace(organizationSlug);
  const table = useIssueTable({
    enabled: workspace.status === "ready",
    organizationRole: workspace.status === "ready" ? workspace.organization.role : "member",
    organizationSlug,
    projectSlug,
  });

  if (workspace.status !== "ready") {
    return null;
  }

  return <IssueTablePanel state={table} />;
}

export { ProjectIssuesRoute };
