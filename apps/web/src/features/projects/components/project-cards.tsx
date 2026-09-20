import { capitalize, formatDate, type ProjectSummary } from "@teamos/shared";
import { CalendarIcon, FolderIcon, LockIcon, UsersIcon } from "lucide-react";

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
import type { ProjectsState } from "../hooks/use-projects";

interface ProjectCardsProps {
  onManageMembers: (project: ProjectSummary) => void;
  state: ProjectsState;
}

function formatMemberCount(count: number): string {
  return count === 1 ? "1 member" : `${count} members`;
}

function ProjectCards({ state }: ProjectCardsProps) {
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
        <Card key={project.id}>
          <CardHeader className="min-h-16">
            <CardTitle>
              <span className="flex min-w-0 items-center gap-2">
                <h3 className="truncate">{project.name}</h3>
              </span>
            </CardTitle>
            {project.visibility === "private" ? (
              <CardAction>
                <Badge variant="outline">
                  <LockIcon aria-hidden="true" />
                  Private
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
                <span className="truncate">{capitalize(project.role)}</span>
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
