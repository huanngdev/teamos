import { useQuery } from "@tanstack/react-query";
import type { OrganizationRole, ProjectMember, ProjectRole, ProjectSummary } from "@teamos/shared";

import { workspaceProjectsPath } from "@/features/workspaces/lib/workspace-paths";
import { listProjectMembers } from "../api/project-api";
import { projectKeys } from "../query-keys";
import { useProjectList } from "./use-project-list";
import { useProjectMembers } from "./use-project-members";

const PREVIEW_MEMBER_LIMIT = 5;

interface UseProjectOverviewOptions {
  enabled: boolean;
  organizationRole: OrganizationRole;
  organizationSlug: string;
  projectSlug: string;
}

type ProjectOverviewState =
  | { status: "loading" }
  | { projectsPath: string; status: "not-found" }
  | { message: string; retry: () => void; status: "error" }
  | { status: "ready"; view: ProjectOverviewView };

interface ProjectOverviewDialog {
  errorMessage: string | null;
  isPending: boolean;
  members: ProjectMember[];
  onClose: () => void;
  onRemoveMember: (memberId: string) => void;
  onRoleChange: (memberId: string, role: ProjectRole) => void;
  open: boolean;
  pendingMemberId: string | null;
}

interface ProjectOverviewView {
  canManageMembers: boolean;
  dialog: ProjectOverviewDialog;
  hiddenMemberCount: number;
  membersError: string | null;
  membersPending: boolean;
  onManageMembers: () => void;
  onRetryMembers: () => void;
  previewMembers: readonly ProjectMember[];
  project: ProjectSummary;
}

/*
 * Resolves a project from the visible list. A slug that is absent is not found,
 * including a private project the caller cannot see, so this page does not need
 * its own read endpoint. The list is not paginated yet; a paged list will need
 * a dedicated read before this lookup stays correct.
 */
function useProjectOverview(options: UseProjectOverviewOptions): ProjectOverviewState {
  const list = useProjectList({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
  });
  const project = list.projects.find((item) => item.slug === options.projectSlug) ?? null;
  const membersQuery = useQuery({
    enabled: options.enabled && project !== null,
    queryFn: () => listProjectMembers(options.organizationSlug, project?.id ?? ""),
    queryKey: projectKeys(options.organizationSlug).members(project?.id ?? "unresolved"),
  });
  const memberActions = useProjectMembers({
    organizationRole: options.organizationRole,
    organizationSlug: options.organizationSlug,
    projects: project === null ? [] : [project],
  });

  if (!options.enabled || list.isPending) {
    return { status: "loading" };
  }

  if (list.errorMessage !== null) {
    return {
      message: "The project could not be loaded.",
      retry: list.retry,
      status: "error",
    };
  }

  if (project === null) {
    return {
      projectsPath: workspaceProjectsPath(options.organizationSlug),
      status: "not-found",
    };
  }

  const members = membersQuery.data ?? [];

  return {
    status: "ready",
    view: {
      canManageMembers: memberActions.can("manage-members", project),
      dialog: {
        errorMessage: memberActions.membersError ?? memberActions.errorMessage,
        isPending: memberActions.isPending,
        members: memberActions.members,
        onClose: memberActions.close,
        onRemoveMember: memberActions.removeMember,
        onRoleChange: memberActions.changeMemberRole,
        open: memberActions.selectedProject !== null,
        pendingMemberId: memberActions.pendingMemberId,
      },
      hiddenMemberCount: Math.max(0, members.length - PREVIEW_MEMBER_LIMIT),
      membersError: membersQuery.isError ? "Project members could not be loaded." : null,
      membersPending: membersQuery.isPending,
      onManageMembers: () => {
        memberActions.open(project.id);
      },
      onRetryMembers: () => {
        void membersQuery.refetch();
      },
      previewMembers: members.slice(0, PREVIEW_MEMBER_LIMIT),
      project,
    },
  };
}

export { useProjectOverview, type ProjectOverviewState, type ProjectOverviewView };
