import type { OrganizationSummary, ProjectSummary } from "@teamos/shared";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";

import { useAuthSession, useSignOut } from "@/features/auth";
import {
  projectOverviewPath,
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
  isCreateOpen: boolean;
  onCloseCreate: () => void;
  onOpenCreate: () => void;
  organizationName: string;
  organizationSlug: string;
  organizations: readonly OrganizationSummary[];
  organizationsErrorMessage: string | null;
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const workspace = useWorkspace(organizationSlug);
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

  const projectName =
    projectList.projects.find((project) => project.slug === projectSlug)?.name ?? null;

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
      overviewPath: projectOverviewPath(organizationSlug, projectSlug),
      projectName,
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

export { useProjectLayout, type ProjectLayoutState, type ProjectLayoutView };
