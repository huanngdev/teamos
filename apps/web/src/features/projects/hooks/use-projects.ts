import type {
  OrganizationRole,
  ProjectAction,
  ProjectMember,
  ProjectRole,
  ProjectSummary,
} from "@teamos/shared";

import { useProjectList, useProjectSearch } from "./use-project-list";
import { useProjectMembers } from "./use-project-members";

interface UseProjectsOptions {
  enabled: boolean;
  organizationRole: OrganizationRole;
  organizationSlug: string;
}

interface ProjectsState {
  can: (action: ProjectAction, project: ProjectSummary) => boolean;
  changeMemberRole: (memberId: string, role: ProjectRole) => void;
  closeMembers: () => void;
  errorMessage: string | null;
  isFetching: boolean;
  isPending: boolean;
  memberError: string | null;
  members: ProjectMember[];
  membersError: string | null;
  membersIsPending: boolean;
  openMembers: (projectId: string) => void;
  pendingMemberId: string | null;
  projects: ProjectSummary[];
  removeMember: (memberId: string) => void;
  retry: () => void;
  searchInput: string;
  searchIsSettling: boolean;
  selectedProject: ProjectSummary | null;
  setSearchInput: (value: string) => void;
}

/*
 * Composition root for the projects panel. Listing/searching and project-member
 * management stay in their own hooks so each keeps one responsibility.
 */
function useProjects(options: UseProjectsOptions): ProjectsState {
  const search = useProjectSearch();
  const list = useProjectList({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
    search: search.debouncedSearch,
  });
  const members = useProjectMembers({
    organizationRole: options.organizationRole,
    organizationSlug: options.organizationSlug,
    projects: list.projects,
  });

  return {
    can: members.can,
    changeMemberRole: members.changeMemberRole,
    closeMembers: members.close,
    errorMessage: list.errorMessage,
    isFetching: list.isFetching,
    isPending: list.isPending,
    memberError: members.errorMessage,
    members: members.members,
    membersError: members.membersError,
    membersIsPending: members.isPending,
    openMembers: members.open,
    pendingMemberId: members.pendingMemberId,
    projects: list.projects,
    removeMember: members.removeMember,
    retry: list.retry,
    searchInput: search.searchInput,
    searchIsSettling: search.isSettling,
    selectedProject: members.selectedProject,
    setSearchInput: search.setSearchInput,
  };
}

export { useProjects, type ProjectsState };
