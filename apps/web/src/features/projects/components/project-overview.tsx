import {
  formatDate,
  getInitials,
  getProjectRoleLabel,
  getProjectVisibilityLabel,
} from "@teamos/shared";
import { ArrowLeftIcon, LockIcon, RefreshCwIcon, UsersIcon } from "lucide-react";
import { Link } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectOverviewState } from "../hooks/use-project-overview";
import { ProjectMembersDialog } from "./project-members-dialog";

interface ProjectOverviewProps {
  state: ProjectOverviewState;
}

function formatMemberCount(count: number): string {
  return count === 1 ? "1 member" : `${count} members`;
}

function ProjectOverviewLoading() {
  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-4xl flex-col gap-4" role="status">
      <span className="sr-only">Loading project</span>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function ProjectOverview({ state }: ProjectOverviewProps) {
  if (state.status === "loading") {
    return <ProjectOverviewLoading />;
  }

  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Project unavailable</AlertTitle>
        <AlertDescription>
          <span className="block">{state.message}</span>
          <Button className="mt-2" onClick={state.retry} variant="outline">
            <RefreshCwIcon data-icon="inline-start" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (state.status === "not-found") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Project not found</EmptyTitle>
          <EmptyDescription>This project does not exist or you cannot view it.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link className={buttonVariants({ variant: "outline" })} to={state.projectsPath}>
            <ArrowLeftIcon data-icon="inline-start" />
            Projects
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  const { view } = state;
  const { project } = view;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-heading text-2xl font-semibold">{project.name}</h1>
          {project.description === null ? null : (
            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Badge variant="outline">
            {project.visibility === "private" ? <LockIcon aria-hidden="true" /> : null}
            {getProjectVisibilityLabel(project.visibility)}
          </Badge>
          {project.role === null ? null : (
            <Badge variant="secondary">{getProjectRoleLabel(project.role)}</Badge>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Visibility, membership, and recent changes.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Members</dt>
              <dd>{formatMemberCount(project.memberCount)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(project.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{formatDate(project.updatedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>People with an explicit role on this project.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {view.membersError === null ? null : (
              <Alert variant="destructive">
                <AlertTitle>Project members unavailable</AlertTitle>
                <AlertDescription>
                  <span className="block">{view.membersError}</span>
                  <Button className="mt-2" onClick={view.onRetryMembers} variant="outline">
                    <RefreshCwIcon data-icon="inline-start" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {view.membersPending ? (
              <div aria-busy="true" className="flex flex-col gap-2" role="status">
                <span className="sr-only">Loading project members</span>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : view.membersError !== null ? null : view.previewMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No one has an explicit project role yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {view.previewMembers.map((member) => (
                  <Item key={member.memberId} variant="outline">
                    <ItemMedia>
                      <Avatar>
                        <AvatarImage alt="" src={member.image ?? undefined} />
                        <AvatarFallback>
                          {getInitials(member.name) || getInitials(member.email)}
                        </AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle>
                        <span className="min-w-0 truncate">{member.name}</span>
                      </ItemTitle>
                      <ItemDescription>
                        <span className="block truncate">{member.email}</span>
                      </ItemDescription>
                      <span className="text-xs text-muted-foreground">
                        {getProjectRoleLabel(member.role)}
                      </span>
                    </ItemContent>
                  </Item>
                ))}
                {view.hiddenMemberCount === 0 ? null : (
                  <p className="text-sm text-muted-foreground">
                    Showing {view.previewMembers.length} of{" "}
                    {view.previewMembers.length + view.hiddenMemberCount}
                  </p>
                )}
              </div>
            )}
            {view.canManageMembers ? (
              <div>
                <Button onClick={view.onManageMembers} variant="outline">
                  <UsersIcon data-icon="inline-start" />
                  Manage members
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <ProjectMembersDialog
        errorMessage={view.dialog.errorMessage}
        isPending={view.dialog.isPending}
        members={view.dialog.members}
        onClose={view.dialog.onClose}
        onRemoveMember={view.dialog.onRemoveMember}
        onRoleChange={view.dialog.onRoleChange}
        open={view.dialog.open}
        pendingMemberId={view.dialog.pendingMemberId}
        projectName={project.name}
      />
    </div>
  );
}

export { ProjectOverview };
