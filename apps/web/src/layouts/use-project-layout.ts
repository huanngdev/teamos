import {
  canPerformProjectAction,
  type OrganizationSummary,
  type ProjectSummary,
} from "@teamos/shared";
import { useState } from "react";
import { matchPath, useLocation, useNavigate, useParams } from "react-router";
import { useAuthSession, useSignOut } from "@/features/auth";
import {
  projectBoardPath,
  projectBoardRoutePattern,
  projectIssueRoutePattern,
  projectIssuesPath,
  projectIssuesRoutePattern,
} from "@/features/issues";
import {
  projectViewRoutePattern,
  projectViewsPath,
  projectViewsRoutePattern,
  useIssueViewHeaderStore,
  useIssueViewNavigation,
} from "@/features/views";
import {
  projectOverviewPath,
  projectRoutePattern,
  projectSettingsPath,
  projectSettingsRoutePattern,
  useCreateProjectForm,
  useProjectList,
  type CreateProjectFormState,
} from "@/features/projects";
import type { ProjectSidebarView } from "@/features/projects/components/project-sidebar";
import {
  useOrganizations,
  useRememberWorkspace,
  useWorkspace,
  workspaceProjectsPath,
} from "@/features/workspaces";

type ProjectLayoutState =
  | { status: "loading" }
  | { status: "not-found" }
  | { message: string; status: "error" }
  | { status: "ready"; view: ProjectLayoutView };

interface ProjectLayoutView extends ProjectSidebarView {
  createForm: CreateProjectFormState;
  viewActive: boolean;
  viewActions: {
    canManage: boolean;
    onDelete: () => void;
    onEdit: () => void;
  } | null;
  viewName: string | null;
  isCreateOpen: boolean;
  onCloseCreate: () => void;
  onOpenCreate: () => void;
  organizationName: string;
  organizationSlug: string;
  organizations: readonly OrganizationSummary[];
  organizationsErrorMessage: string | null;
  pageLabel: string | null;
  projectSlug: string;
  projects: readonly ProjectSummary[];
  signOutError: string | null;
}

/*
 * Project pages use their own shell. Workspace tabs stay on the workspace
 * layout; this hook only loads what the project sidebar and inset need.
 */
function useProjectLayout(): ProjectLayoutState {
  const { organizationSlug: organizationSlugParam, projectSlug = "" } = useParams();
  const organizationSlug = organizationSlugParam ?? "";
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const overviewMatch = matchPath({ end: true, path: projectRoutePattern }, pathname);
  const issuesMatch = matchPath({ end: true, path: projectIssuesRoutePattern }, pathname);
  const issueDetailMatch = matchPath({ end: true, path: projectIssueRoutePattern }, pathname);
  const boardMatch = matchPath({ end: true, path: projectBoardRoutePattern }, pathname);
  const settingsMatch = matchPath({ end: true, path: projectSettingsRoutePattern }, pathname);
  const viewsMatch = matchPath({ end: true, path: projectViewsRoutePattern }, pathname);
  const viewMatch = matchPath({ end: true, path: projectViewRoutePattern }, pathname);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const workspace = useWorkspace(organizationSlug);
  const viewNavigation = useIssueViewNavigation({
    activeViewId: viewMatch?.params.viewId ?? "",
    enabled: workspace.status === "ready",
    organizationSlug,
    projectSlug,
  });
  const viewActions = useIssueViewHeaderStore((state) => state.actions);
  const organizations = useOrganizations();
  const session = useAuthSession();
  const signOut = useSignOut();
  const isReady = workspace.status === "ready";
  const projectList = useProjectList({
    enabled: isReady,
    organizationSlug,
  });
  const createForm = useCreateProjectForm({
    onCreated: async (project) => {
      setIsCreateOpen(false);
      await navigate(projectOverviewPath(organizationSlug, project.slug));
    },
    organizationSlug,
  });

  useRememberWorkspace(
    session.status === "authenticated" ? session.user.id : undefined,
    isReady ? workspace.organization.slug : undefined,
  );

  if (organizationSlug.length === 0 || projectSlug.length === 0) {
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

  const currentProject =
    projectList.projects.find((project) => project.slug === projectSlug) ?? null;
  const showSettings =
    currentProject !== null &&
    canPerformProjectAction("update", {
      organizationRole: workspace.organization.role,
      projectRole: currentProject.role,
      visibility: currentProject.visibility,
    });

  return {
    status: "ready",
    view: {
      createForm,
      isCreateOpen,
      isSigningOut: signOut.isPending,
      onCloseCreate: () => {
        setIsCreateOpen(false);
        createForm.reset();
      },
      onOpenCreate: () => {
        setIsCreateOpen(true);
      },
      onSignOut: () => {
        void signOut.signOut();
      },
      organizationName: workspace.organization.name,
      organizationSlug: workspace.organization.slug,
      organizations: organizations.organizations,
      organizationsErrorMessage: organizations.errorMessage,
      activeViewId: viewNavigation.activeViewId,
      hasMoreViews: viewNavigation.hasMore,
      loadingMoreViews: viewNavigation.loadingMore,
      onLoadMoreViews: viewNavigation.onLoadMore,
      onOpenViews: () => {
        if (viewsMatch !== null) {
          return;
        }

        void navigate(projectViewsPath(organizationSlug, projectSlug));
      },
      onViewsExpandedChange: viewNavigation.onExpandedChange,
      savedViews: viewNavigation.items,
      viewActions: viewMatch === null ? null : viewActions,
      viewName: viewNavigation.viewName,
      viewsExpanded: viewNavigation.expanded,
      pageLabel: projectPageLabel(
        overviewMatch !== null,
        issuesMatch !== null || issueDetailMatch !== null,
        boardMatch !== null,
        viewsMatch !== null,
        viewMatch !== null,
        settingsMatch !== null,
      ),
      boardActive: boardMatch !== null,
      boardPath: projectBoardPath(organizationSlug, projectSlug),
      viewActive: viewMatch !== null,
      viewsActive: viewsMatch !== null || viewMatch !== null,
      viewsPath: projectViewsPath(organizationSlug, projectSlug),
      issuesActive: issuesMatch !== null || issueDetailMatch !== null,
      issuesPath: projectIssuesPath(organizationSlug, projectSlug),
      overviewActive: overviewMatch !== null,
      overviewPath: projectOverviewPath(organizationSlug, projectSlug),
      projectName: currentProject?.name ?? null,
      settingsActive: settingsMatch !== null,
      settingsPath: projectSettingsPath(organizationSlug, projectSlug),
      showSettings,
      projectSlug,
      projects: projectList.projects,
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

function projectPageLabel(
  isOverview: boolean,
  isIssues: boolean,
  isBoard: boolean,
  isViews: boolean,
  isView: boolean,
  isSettings: boolean,
): string | null {
  const pages = [
    { active: isOverview, label: "Overview" },
    { active: isIssues, label: "Issues" },
    { active: isBoard, label: "Board" },
    { active: isView, label: "View" },
    { active: isViews, label: "Views" },
    { active: isSettings, label: "Settings" },
  ];

  return pages.find((page) => page.active)?.label ?? null;
}

export { useProjectLayout, type ProjectLayoutState, type ProjectLayoutView };
