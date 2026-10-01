import {
  getIssuePriorityLabel,
  getIssueStatusCategoryLabel,
  issuePriorities,
  issueStatusCategories,
  type ProjectMember,
  type ProjectStatusSummary,
} from "@teamos/shared";
import { useQuery } from "@tanstack/react-query";

import { issueKeys, listProjectStatuses } from "@/features/issues";
import { listProjectMembers, projectKeys } from "@/features/projects";

interface IssueViewFilterOption {
  id: string;
  label: string;
}

interface IssueViewCatalog {
  assigneeOptions: IssueViewFilterOption[];
  categoryOptions: IssueViewFilterOption[];
  isPending: boolean;
  members: ProjectMember[];
  membersError: string | null;
  priorityOptions: IssueViewFilterOption[];
  retry: () => void;
  statusError: boolean;
  statusOptions: IssueViewFilterOption[];
  statuses: ProjectStatusSummary[];
}

function useIssueViewCatalog(options: {
  enabled: boolean;
  organizationSlug: string;
  projectId: string | null;
}): IssueViewCatalog {
  const ready = options.enabled && options.projectId !== null;
  const statuses = useQuery({
    enabled: ready,
    queryFn: () => listProjectStatuses(options.organizationSlug, options.projectId ?? ""),
    queryKey:
      options.projectId === null
        ? ["issue-view-catalog", "statuses", "pending"]
        : issueKeys(options.organizationSlug, options.projectId).statuses(),
  });
  const members = useQuery({
    enabled: ready,
    queryFn: () => listProjectMembers(options.organizationSlug, options.projectId ?? ""),
    queryKey:
      options.projectId === null
        ? ["issue-view-catalog", "members", "pending"]
        : projectKeys(options.organizationSlug).members(options.projectId),
  });
  const statusRows = statuses.data ?? [];
  const memberRows = members.data ?? [];

  return {
    assigneeOptions: [
      { id: "me", label: "Me" },
      { id: "unassigned", label: "Unassigned" },
      ...memberRows.map((member) => ({ id: member.memberId, label: member.name })),
    ],
    categoryOptions: issueStatusCategories.map((category) => ({
      id: category,
      label: getIssueStatusCategoryLabel(category),
    })),
    isPending: ready && statuses.isPending,
    members: memberRows,
    membersError: members.isError ? "Project members could not be loaded." : null,
    priorityOptions: issuePriorities.map((priority) => ({
      id: priority,
      label: getIssuePriorityLabel(priority),
    })),
    retry: () => {
      void statuses.refetch();
      void members.refetch();
    },
    statusError: statuses.isError,
    statusOptions: statusRows.map((status) => ({ id: status.id, label: status.name })),
    statuses: statusRows,
  };
}

export { useIssueViewCatalog, type IssueViewCatalog, type IssueViewFilterOption };
