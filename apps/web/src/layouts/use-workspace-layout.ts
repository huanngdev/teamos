import type { OrganizationSummary } from "@teamos/shared";
import { useLocation, useNavigate, useParams } from "react-router";

import { useAuthSession, useSignOut } from "@/features/auth";
import { useProjectList } from "@/features/projects";
import {
  useOrganizations,
  useRememberWorkspace,
  useWorkspace,
  workspaceMembersPath,
  workspaceProjectsPath,
} from "@/features/workspaces";

type WorkspaceTab = "members" | "projects";

type WorkspaceLayoutState =
  | { status: "loading" }
  | { status: "not-found" }
  | { message: string; status: "error" }
  | { status: "ready"; view: WorkspaceLayoutView };

interface WorkspaceLayoutView {
  activeTab: WorkspaceTab;
  isSigningOut: boolean;
  memberCount: number;
  onSelectTab: (tab: WorkspaceTab) => void;
  onSignOut: () => void;
  organizationName: string;
  organizationSlug: string;
  organizations: readonly OrganizationSummary[];
  organizationsErrorMessage: string | null;
  projectCount: number;
  projectsPath: string;
  signOutError: string | null;
  membersPath: string;
  user: { email: string; image: string | null; name: string };
}

/*
 * Orchestration for the workspace shell. It loads the workspace context, the
 * switcher list, and the session, then exposes a typed view model so the layout
 * component stays presentational.
 */
function useWorkspaceLayout(): WorkspaceLayoutState {
  const { organizationSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const workspace = useWorkspace(organizationSlug ?? "");
  const organizations = useOrganizations();
  const session = useAuthSession();
  const signOut = useSignOut();
  const isReady = workspace.status === "ready";
  const projectList = useProjectList({
    enabled: isReady,
    organizationSlug: organizationSlug ?? "",
  });

  useRememberWorkspace(
    session.status === "authenticated" ? session.user.id : undefined,
    isReady ? workspace.organization.slug : undefined,
  );

  if (organizationSlug === undefined) {
    return { status: "not-found" };
  }

  if (workspace.status === "loading") {
    return { status: "loading" };
  }

  if (workspace.status === "not-found") {
    return { status: "not-found" };
  }

  if (workspace.status === "error") {
    return { message: workspace.message, status: "error" };
  }

  if (session.status !== "authenticated") {
    return { status: "loading" };
  }

  return {
    status: "ready",
    view: {
      activeTab: location.pathname.endsWith("/members") ? "members" : "projects",
      isSigningOut: signOut.isPending,
      memberCount: workspace.organization.memberCount,
      membersPath: workspaceMembersPath(organizationSlug),
      onSelectTab: (tab) => {
        void navigate(
          tab === "members"
            ? workspaceMembersPath(organizationSlug)
            : workspaceProjectsPath(organizationSlug),
        );
      },
      onSignOut: () => {
        void signOut.signOut();
      },
      organizationName: workspace.organization.name,
      organizationSlug: workspace.organization.slug,
      organizations: organizations.organizations,
      organizationsErrorMessage: organizations.errorMessage,
      projectCount: projectList.projects.length,
      projectsPath: workspaceProjectsPath(organizationSlug),
      signOutError: signOut.errorMessage,
      user: {
        email: session.user.email,
        image: session.user.image ?? null,
        name: session.user.name,
      },
    },
  };
}

export { useWorkspaceLayout, type WorkspaceLayoutState, type WorkspaceLayoutView };
