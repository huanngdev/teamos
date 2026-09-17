import { useParams } from "react-router";

import { useAuthSession } from "@/features/auth";
import { MembersPanel } from "@/features/members";
import { useWorkspaceMembersPanel } from "@/features/members";
import { useWorkspace } from "@/features/workspaces";

function WorkspaceMembersRoute() {
  const { organizationSlug } = useParams();
  const workspace = useWorkspace(organizationSlug ?? "");
  const session = useAuthSession();
  const isReady = workspace.status === "ready" && session.status === "authenticated";
  const view = useWorkspaceMembersPanel({
    actorRole: workspace.status === "ready" ? workspace.organization.role : "member",
    currentUserId: session.status === "authenticated" ? session.user.id : "",
    enabled: isReady,
    organizationSlug: organizationSlug ?? "",
  });

  /* The workspace layout owns loading, not-found, and error states. */
  if (!isReady || workspace.status !== "ready") {
    return null;
  }

  return (
    <div className="mt-3">
      <MembersPanel organizationName={workspace.organization.name} view={view} />
    </div>
  );
}

export { WorkspaceMembersRoute };
