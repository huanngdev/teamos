import { useAuthSession } from "@/features/auth";
import { readRecentWorkspaceSlug } from "../lib/recent-workspace-storage";
import { resolveWorkspaceDestination } from "../lib/resolve-workspace-destination";
import { workspaceProjectsPath, workspacesNewPath } from "../lib/workspace-paths";

import { useOrganizations } from "./use-organizations";

type WorkspaceDestinationState =
  | { status: "loading" }
  | { message: string; retry: () => void; status: "error" }
  | { path: string; status: "ready" };

/*
 * Resolves where a user should land when no workspace is in the URL. Every
 * entry point (`/`, login, OAuth completion, invitation acceptance) uses this
 * hook so the rule stays in one place.
 */
function useWorkspaceDestination(): WorkspaceDestinationState {
  const session = useAuthSession();
  const isAuthenticated = session.status === "authenticated";
  const organizations = useOrganizations({ enabled: isAuthenticated });

  if (!isAuthenticated) {
    return { status: "loading" };
  }

  if (organizations.isPending) {
    return { status: "loading" };
  }

  if (organizations.errorMessage !== null) {
    return { message: organizations.errorMessage, retry: organizations.retry, status: "error" };
  }

  const destination = resolveWorkspaceDestination(
    organizations.organizations,
    readRecentWorkspaceSlug(session.user.id),
  );

  if (destination.kind === "create") {
    return { path: workspacesNewPath(), status: "ready" };
  }

  return { path: workspaceProjectsPath(destination.slug), status: "ready" };
}

export { useWorkspaceDestination, type WorkspaceDestinationState };
