import {
  ArrowsClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  FunnelIcon,
  PlusIcon,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchToolbar } from "@/shared";
import type { IssueViewListState } from "../hooks/use-issue-view-list";
import { IssueViewDeleteDialog } from "./issue-view-delete-dialog";
import { IssueViewFormDialog } from "./issue-view-form-dialog";
import { IssueViewTable } from "./issue-view-table";

function IssueViewList({ state }: { state: IssueViewListState }) {
  if (state.status === "loading") {
    return (
      <div aria-busy="true" className="flex flex-col gap-3 p-4" role="status">
        <span className="sr-only">Loading views</span>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <Alert>
        <AlertTitle>Project not found</AlertTitle>
        <AlertDescription>This project is not available in the workspace.</AlertDescription>
      </Alert>
    );
  }

  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Views unavailable</AlertTitle>
        <AlertDescription>
          <span className="block">{state.message}</span>
          <Button className="mt-2" onClick={state.retry} type="button" variant="outline">
            <ArrowsClockwiseIcon data-icon="inline-start" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const { view } = state;
  const empty = view.total === 0 && view.search.trim().length === 0;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="border-b p-2">
        <SearchToolbar
          action={{ icon: PlusIcon, label: "New view", onClick: view.onCreate }}
          isSearching={view.isSearching}
          name="view-search"
          onSearchChange={view.onSearchChange}
          placeholder="Search views"
          search={view.search}
          searchLabel="Search views"
        />
      </div>
      {empty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FunnelIcon />
            </EmptyMedia>
            <EmptyTitle>No views yet</EmptyTitle>
            <EmptyDescription>Save a filter set to open the same board again.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="min-h-0 min-w-0 flex-1 [&_[data-slot=table-container]]:h-full [&_[data-slot=table-container]]:overflow-auto">
          <IssueViewTable
            items={view.items}
            onDelete={view.onDelete}
            onEdit={view.onEdit}
            searching={view.search.trim().length > 0}
          />
        </div>
      )}
      {view.hasPrevious || view.hasNext ? (
        <div className="flex items-center gap-2 border-t px-2 py-2">
          <span className="text-sm text-muted-foreground tabular-nums">
            {view.rangeStart}–{view.rangeEnd} of {view.total}
          </span>
          <Button
            className="ml-auto"
            disabled={!view.hasPrevious}
            onClick={view.onPrevious}
            type="button"
            variant="outline"
          >
            <CaretLeftIcon data-icon="inline-start" />
            Previous
          </Button>
          <Button disabled={!view.hasNext} onClick={view.onNext} type="button" variant="outline">
            Next
            <CaretRightIcon data-icon="inline-end" />
          </Button>
        </div>
      ) : null}
      <IssueViewFormDialog
        assignees={view.assignees}
        catalog={view.catalog}
        errorMessage={view.formError}
        form={view.form}
        knownAssignees={view.knownAssignees}
        statuses={view.catalog.statuses}
      />
      <IssueViewDeleteDialog
        name={view.deleteName}
        onCancel={view.onCancelDelete}
        onConfirm={view.onConfirmDelete}
        open={view.deleteName !== null}
      />
    </div>
  );
}

export { IssueViewList };
