import {
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  CopyIcon,
  CubeIcon,
  DotsThreeIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { formatDateTime } from "@teamos/shared";
import { Component, lazy, Suspense, type ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { IssueDetailState } from "../hooks/use-issue-detail";
import { DeleteIssueDialog } from "./delete-issue-dialog";
import { IssueAssigneePicker } from "./issue-assignee-picker";
import { IssuePriorityPicker, IssueStatusPicker } from "./issue-field-pickers";
import { IssueTitleInput } from "./issue-title-input";

const IssueEditor = lazy(() =>
  import("./issue-editor/issue-editor").then((module) => ({ default: module.IssueEditor })),
);

function IssueDetail({ state }: { state: IssueDetailState }) {
  if (state.status === "loading") {
    return <IssueDetailStatus onDismiss={state.onDismiss} title="Loading issue" />;
  }

  if (state.status === "error") {
    return (
      <IssueDetailStatus
        message={state.message}
        onDismiss={state.onDismiss}
        onRetry={state.retry}
        title="Issue unavailable"
      />
    );
  }

  if (state.status !== "ready") {
    return null;
  }

  const { view } = state;
  const saveFailed =
    view.saveLabel !== null && view.saveLabel !== "Saving" && view.saveLabel !== "Saved";

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-4 overflow-y-auto px-4 py-6 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 items-center">
          <p className="font-mono text-xs text-muted-foreground tabular-nums">{view.code}</p>
          {view.saveLabel === "Saving" || view.saveLabel === "Saved" ? (
            <p className="text-xs text-muted-foreground">{view.saveLabel}</p>
          ) : null}
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button aria-label="Issue actions" size="icon" type="button" variant="ghost">
                  <DotsThreeIcon />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={view.onCopyLink}>
                  <CopyIcon data-icon="inline-start" />
                  Copy link
                </DropdownMenuItem>
                {view.canDelete ? (
                  <DropdownMenuItem onClick={view.onDelete} variant="destructive">
                    <TrashIcon data-icon="inline-start" />
                    Delete
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-4">
        <div className="min-w-0 lg:col-span-3">
          <IssueTitleInput
            disabled={!view.canUpdate}
            error={view.titleError}
            id="issue-detail-title"
            label="Title"
            onChange={view.onTitle}
            placeholder="Issue title"
            value={view.title}
            variant="page"
          />
          <div className="my-4">
            <IssueEditorBoundary>
              <Suspense fallback={<Skeleton className="h-6 w-40" />}>
                <IssueEditor
                  document={view.content}
                  editable={view.canUpdate}
                  generation={view.editorGeneration}
                  onChange={view.onContent}
                />
              </Suspense>
            </IssueEditorBoundary>
          </div>
          {view.contentError === null ? null : (
            <Alert className="mt-3" variant="destructive">
              <AlertTitle>Content needs attention</AlertTitle>
              <AlertDescription>{view.contentError}</AlertDescription>
            </Alert>
          )}
          {/*
            Reactions, sub-issues, and activity stay out of the page until they work.
            <div className="flex items-center gap-1">
              <Button aria-label="Add reaction" disabled size="icon" type="button" variant="ghost">
                <SmileyIcon />
              </Button>
              <Button aria-label="Add attachment" disabled size="icon" type="button" variant="ghost">
                <PaperclipIcon />
              </Button>
            </div>
            <Button className="mt-2" disabled type="button" variant="ghost">
              <PlusIcon data-icon="inline-start" />
              Add sub-issues
            </Button>
            <Separator className="my-6" />
            <section aria-label="Activity" className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Activity</h2>
                <Button disabled type="button" variant="ghost">
                  <BellSlashIcon data-icon="inline-start" />
                  Unsubscribe
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Activity is not available yet.</p>
              <div className="rounded-xl border bg-muted/20 p-3">
                <textarea
                  aria-label="Comment"
                  className="min-h-16 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  disabled
                  placeholder="Leave a comment..."
                />
                <div className="flex justify-end gap-1">
                  <Button
                    aria-label="Attach a file to the comment"
                    disabled
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <PaperclipIcon />
                  </Button>
                  <Button aria-label="Send comment" disabled size="icon" type="button" variant="ghost">
                    <ArrowUpIcon />
                  </Button>
                </div>
              </div>
            </section>
          */}
        </div>
        <aside className="flex flex-col gap-4 lg:col-span-1">
          <section className="flex flex-col gap-1">
            <h2 className="text-xs text-muted-foreground mb-2">Properties</h2>
            <div className="w-fit">
              <IssueStatusPicker
                appearance="property"
                disabled={!view.canUpdate || view.statuses.length === 0}
                onChange={view.onStatus}
                statuses={view.statuses}
                value={view.statusId}
              />
            </div>
            <div className="w-fit">
              <IssuePriorityPicker
                appearance="property"
                disabled={!view.canUpdate}
                onChange={view.onPriority}
                value={view.priority}
              />
            </div>
            <div className="flex items-center gap-1">
              <IssueAssigneePicker
                appearance="property"
                disabled={!view.canUpdate}
                onSelect={view.onAssignees}
                picker={view.assignees}
                selected={view.selectedAssignees}
              />
            </div>
          </section>
          {view.statusesError === null ? null : (
            <Alert variant="destructive">
              <AlertDescription>{view.statusesError}</AlertDescription>
            </Alert>
          )}
          {view.assignees.error === null ? null : (
            <Alert variant="destructive">
              <AlertDescription>{view.assignees.error}</AlertDescription>
            </Alert>
          )}
          <section className="flex flex-col gap-1">
            <h2 className="text-xs mb-2 text-muted-foreground">Project</h2>
            <Button className="justify-start" disabled size="sm" type="button" variant="ghost">
              <CubeIcon data-icon="inline-start" />
              {view.projectName}
            </Button>
          </section>
          <table className="text-xs text-muted-foreground">
            <tbody>
              <tr>
                <td>Created</td>
                <td>{formatDateTime(view.createdAt)}</td>
              </tr>
              <tr>
                <td>Updated</td>
                <td>{formatDateTime(view.updatedAt)}</td>
              </tr>
            </tbody>
          </table>
        </aside>
      </div>
      {saveFailed ? (
        <Alert variant="destructive">
          <AlertDescription>
            <span className="block">{view.saveLabel}</span>
            <Button className="mt-2" onClick={view.onRefresh} type="button" variant="outline">
              <ArrowsClockwiseIcon data-icon="inline-start" />
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <DeleteIssueDialog
        error={view.deleteError}
        isPending={view.isPending}
        onCancel={view.onCancelDelete}
        onConfirm={view.onConfirmDelete}
        open={view.deleteOpen}
      />
    </div>
  );
}

function IssueDetailStatus({
  message,
  onDismiss,
  onRetry,
  title,
}: {
  message?: string;
  onDismiss: () => void;
  onRetry?: () => void;
  title: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <Alert variant={message === undefined ? "default" : "destructive"}>
        <AlertTitle>{title}</AlertTitle>
        {message === undefined ? null : <AlertDescription>{message}</AlertDescription>}
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onDismiss} type="button" variant="outline">
          <ArrowLeftIcon data-icon="inline-start" />
          All issues
        </Button>
        {onRetry === undefined ? null : (
          <Button onClick={onRetry} type="button" variant="outline">
            <ArrowsClockwiseIcon data-icon="inline-start" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

class IssueEditorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Content unavailable</AlertTitle>
          <AlertDescription>This issue content could not be shown.</AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export { IssueDetail };
