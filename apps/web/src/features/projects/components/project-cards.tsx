import { formatDate, getProjectRoleLabel, getProjectVisibilityLabel } from "@teamos/shared";
import { Link } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { projectOverviewPath } from "../lib/project-paths";
import type { ProjectsState } from "../hooks/use-projects";
import { CalendarIcon, FolderIcon, LockKeyIcon, UsersIcon } from "@phosphor-icons/react";

interface ProjectCardsProps {
  organizationSlug: string;
  state: ProjectsState;
}

function formatMemberCount(count: number): string {
  return count === 1 ? "1 member" : `${count} members`;
}

function ProjectCards({ organizationSlug, state }: ProjectCardsProps) {
  if (state.isPending) {
    return (
      <div aria-busy="true" className="grid gap-3 sm:grid-cols-2" role="status">
        <span className="sr-only">Loading projects</span>
        {[0, 1, 2, 3].map((index) => (
          <Skeleton className="h-36 w-full" key={index} />
        ))}
      </div>
    );
  }

  if (state.errorMessage !== null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Projects unavailable</AlertTitle>
        <AlertDescription>
          <span className="block">{state.errorMessage}</span>
          <Button className="mt-2" onClick={state.retry} variant="outline">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (state.projects.length === 0) {
    const isSearching = state.searchInput.trim().length > 0;

    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderIcon />
          </EmptyMedia>
          <EmptyTitle>
            {isSearching ? "No projects match your search" : "No projects yet"}
          </EmptyTitle>
          <EmptyDescription>
            {isSearching
              ? "Try a different project name."
              : "Any workspace member can create a project and becomes its lead."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div aria-busy={state.isFetching} className="grid gap-3 sm:grid-cols-2">
      {state.projects.map((project) => (
        <Card className="relative" key={project.id}>
          <CardHeader className="min-h-16">
            <CardTitle>
              <span className="flex min-w-0 items-center gap-2">
                <h3 className="truncate">
                  <Link
                    className="rounded-sm after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring"
                    to={projectOverviewPath(organizationSlug, project.slug)}
                  >
                    {project.name}
                  </Link>
                </h3>
              </span>
            </CardTitle>
            {project.visibility === "private" ? (
              <CardAction>
                <Badge variant="outline">
                  <LockKeyIcon aria-hidden="true" />
                  {getProjectVisibilityLabel(project.visibility)}
                </Badge>
              </CardAction>
            ) : null}
            {project.description === null ? null : (
              <CardDescription>
                <span className="line-clamp-2">{project.description}</span>
              </CardDescription>
            )}
          </CardHeader>

          <CardFooter className="justify-between">
            <div className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <UsersIcon aria-hidden="true" className="size-3.5" />
                {formatMemberCount(project.memberCount)}
              </span>
              {project.role === null ? null : (
                <span className="truncate">{getProjectRoleLabel(project.role)}</span>
              )}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon aria-hidden="true" className="size-3.5" />
              {formatDate(project.createdAt)}
            </span>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export { ProjectCards };
