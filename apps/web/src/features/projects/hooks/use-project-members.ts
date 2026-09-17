import { useMutation, useQuery } from "@tanstack/react-query";
import {
  canPerformProjectAction,
  type OrganizationRole,
  type ProjectAction,
  type ProjectMember,
  type ProjectRole,
  type ProjectSummary,
} from "@teamos/shared";
import { useState } from "react";

import { listProjectMembers, removeProjectMember, setProjectMember } from "../api/project-api";
import { useProjectListInvalidator } from "./use-project-list";
import { projectKeys } from "../query-keys";

interface UseProjectMembersOptions {
  organizationRole: OrganizationRole;
  organizationSlug: string;
  projects: readonly ProjectSummary[];
}

interface ProjectMembersState {
  can: (action: ProjectAction, project: ProjectSummary) => boolean;
  changeMemberRole: (memberId: string, role: ProjectRole) => void;
  close: () => void;
  errorMessage: string | null;
  isPending: boolean;
  members: ProjectMember[];
  membersError: string | null;
  open: (projectId: string) => void;
  pendingMemberId: string | null;
  removeMember: (memberId: string) => void;
  selectedProject: ProjectSummary | null;
}

/*
 * Owns the project-member dialog: which project is open, its member list, and
 * the role mutations. Listing and searching live in `useProjectList`.
 *
 * Project permissions are evaluated with the shared policy so the UI never
 * duplicates role rules. The server stays authoritative for every action.
 */
function useProjectMembers(options: UseProjectMembersOptions): ProjectMembersState {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const invalidateList = useProjectListInvalidator(options.organizationSlug);

  const membersQuery = useQuery({
    enabled: selectedProjectId !== null,
    queryFn: () => listProjectMembers(options.organizationSlug, selectedProjectId ?? ""),
    queryKey: projectKeys(options.organizationSlug).members(selectedProjectId ?? ""),
  });

  const setMemberMutation = useMutation({
    mutationFn: (input: { projectId: string; memberId: string; role: ProjectRole }) =>
      setProjectMember(options.organizationSlug, input.projectId, input.memberId, input.role),
    onSettled: invalidateList,
  });

  const removeMemberMutation = useMutation({
    mutationFn: (input: { projectId: string; memberId: string }) =>
      removeProjectMember(options.organizationSlug, input.projectId, input.memberId),
    onSettled: invalidateList,
  });

  const pendingMemberId = setMemberMutation.isPending
    ? (setMemberMutation.variables?.memberId ?? null)
    : removeMemberMutation.isPending
      ? (removeMemberMutation.variables?.memberId ?? null)
      : null;

  return {
    can: (action, project) =>
      canPerformProjectAction(action, {
        organizationRole: options.organizationRole,
        projectRole: project.role,
        visibility: project.visibility,
      }),
    changeMemberRole: (memberId, role) => {
      if (selectedProjectId === null) {
        return;
      }

      setMemberMutation.mutate({ memberId, projectId: selectedProjectId, role });
    },
    close: () => {
      setSelectedProjectId(null);
    },
    errorMessage:
      setMemberMutation.isError || removeMemberMutation.isError
        ? "The project role could not be updated."
        : null,
    isPending: membersQuery.isPending,
    members: membersQuery.data ?? [],
    membersError: membersQuery.isError ? "Project members could not be loaded." : null,
    open: (projectId) => {
      setSelectedProjectId(projectId);
    },
    pendingMemberId,
    removeMember: (memberId) => {
      if (selectedProjectId === null) {
        return;
      }

      removeMemberMutation.mutate({ memberId, projectId: selectedProjectId });
    },
    selectedProject: options.projects.find((project) => project.id === selectedProjectId) ?? null,
  };
}

export { useProjectMembers, type ProjectMembersState };
