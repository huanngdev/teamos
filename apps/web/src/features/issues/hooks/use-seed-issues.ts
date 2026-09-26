import { useQueryClient } from "@tanstack/react-query";
import { canPerformProjectAction, issuePriorities } from "@teamos/shared";
import { useState } from "react";
import { useParams } from "react-router";

import { listProjectMembers, useProjectList } from "@/features/projects";
import { useWorkspace } from "@/features/workspaces";
import { notify } from "@/shared";
import { createIssue, listIssues, listProjectStatuses } from "../api/issue-api";
import { readIssueError } from "../lib/issue-errors";
import { planSeedIssues } from "../lib/seed-issues";
import { issueKeys } from "../query-keys";

const TITLE_MAX = 140;
const DESCRIPTION_MAX = 5000;

interface SeedIssuesState {
  isPending: boolean;
  onSeed: () => void;
  visible: boolean;
}

function useSeedIssues(): SeedIssuesState {
  const { organizationSlug: organizationSlugParam, projectSlug = "" } = useParams();
  const organizationSlug = organizationSlugParam ?? "";
  const queryClient = useQueryClient();
  const workspace = useWorkspace(organizationSlug);
  const projectList = useProjectList({
    enabled: workspace.status === "ready",
    organizationSlug,
  });
  const project = projectList.projects.find((item) => item.slug === projectSlug) ?? null;
  const [isPending, setIsPending] = useState(false);
  const visible =
    import.meta.env.DEV &&
    workspace.status === "ready" &&
    project !== null &&
    canPerformProjectAction("create-issue", {
      organizationRole: workspace.organization.role,
      projectRole: project.role,
      visibility: project.visibility,
    });

  const onSeed = () => {
    if (!visible || project === null || isPending) {
      return;
    }

    setIsPending(true);
    void seedProjectIssues(organizationSlug, project.id)
      .then(async (result) => {
        if (result.status === "skipped") {
          notify.error(
            result.reason === "empty"
              ? "Add a column before seeding issues."
              : "This board already has 200 issues.",
          );
          return;
        }

        await queryClient.invalidateQueries({
          queryKey: issueKeys(organizationSlug, project.id).prefix(),
        });
        notify.success(`Seeded ${result.count} issues`);
      })
      .catch(async (error: unknown) => {
        if (project !== null) {
          await queryClient.invalidateQueries({
            queryKey: issueKeys(organizationSlug, project.id).prefix(),
          });
        }

        notify.error(
          readIssueError(error, "Issues could not be seeded.") ?? "Issues could not be seeded.",
        );
      })
      .finally(() => {
        setIsPending(false);
      });
  };

  return { isPending, onSeed, visible };
}

async function seedProjectIssues(
  organizationSlug: string,
  projectId: string,
): Promise<{ count: number; status: "seeded" } | { reason: "empty" | "full"; status: "skipped" }> {
  if (!import.meta.env.DEV) {
    return { reason: "empty", status: "skipped" };
  }

  /*
   * Vite replaces this flag at build time, so faker is omitted from production.
   */
  const { faker } = await import("@faker-js/faker");
  const [statuses, listed, members] = await Promise.all([
    listProjectStatuses(organizationSlug, projectId),
    listIssues(organizationSlug, projectId),
    listProjectMembers(organizationSlug, projectId),
  ]);
  const plan = planSeedIssues(
    statuses.map((status) => status.id),
    listed.total,
  );

  if (plan.status === "skipped") {
    return plan;
  }

  for (const statusId of plan.slots) {
    const description = faker.datatype.boolean()
      ? faker.lorem.paragraph().trim().slice(0, DESCRIPTION_MAX)
      : "";
    const assignee =
      members.length === 0 || !faker.datatype.boolean()
        ? null
        : faker.helpers.arrayElement(members).memberId;
    const title = faker.lorem
      .sentence({ max: 8, min: 3 })
      .replace(/\.$/, "")
      .trim()
      .slice(0, TITLE_MAX);

    await createIssue(organizationSlug, projectId, {
      assigneeMemberId: assignee,
      priority: faker.helpers.arrayElement([...issuePriorities]),
      statusId,
      title: title.length > 0 ? title : "Seeded issue",
      ...(description.length > 0 ? { description } : {}),
    });
  }

  return { count: plan.slots.length, status: "seeded" };
}

export { useSeedIssues };
