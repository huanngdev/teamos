import { ArrowsClockwiseIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { IssueTableState } from "../hooks/use-issue-table";
import { IssueTableContext } from "../lib/issue-table-context";
import { DeleteSelectedIssuesDialog } from "./delete-selected-issues-dialog";
import { IssueDataTable } from "./issue-data-table";
import { IssueFormDialog } from "./issue-form-dialog";
import { IssueTablePagination } from "./issue-table-pagination";
import { IssueTableToolbar } from "./issue-table-toolbar";

interface IssueTablePanelProps {
  state: IssueTableState;
}

function IssueTablePanel({ state }: IssueTablePanelProps) {
  if (state.status === "loading") {
    return <IssueTableLoading />;
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
        <AlertTitle>Issue list unavailable</AlertTitle>
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

  return (
    <IssueTableContext.Provider
      value={{
        facets: view.facets,
        isSelected: view.isSelected,
        members: view.members,
        openIssue: view.openIssue,
        rows: view.rows,
        statuses: view.statuses,
        togglePage: view.togglePage,
        toggleSelected: view.toggleSelected,
      }}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        {view.truncated === null ? null : (
          <Alert>
            <AlertTitle>Issue list truncated</AlertTitle>
            <AlertDescription>
              Showing {view.truncated.shown} of {view.truncated.total} issues.
            </AlertDescription>
          </Alert>
        )}
        <IssueTableToolbar
          canCreate={view.canCreate}
          canDelete={view.canDelete}
          hasFilters={view.hasFilters}
          onClearFilters={view.onClearFilters}
          onClearSearch={view.onClearSearch}
          onCreate={view.onCreate}
          onDeleteSelected={view.onDeleteSelected}
          onSearchChange={view.onSearchChange}
          search={view.search}
          selectedCount={view.selectedCount}
          table={view.table}
        />
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden [&_[data-slot=table-container]]:h-full [&_[data-slot=table-container]]:overflow-auto">
          <IssueDataTable table={view.table} />
        </div>
        <IssueTablePagination table={view.table} />
      </div>
      <DeleteSelectedIssuesDialog
        count={view.deleteSelected.count}
        error={view.deleteSelected.error}
        isPending={view.deleteSelected.isPending}
        onCancel={view.deleteSelected.cancel}
        onConfirm={view.deleteSelected.confirm}
        open={view.deleteSelected.open}
      />
      <IssueFormDialog
        form={view.issueForm}
        members={view.members}
        membersError={view.membersError}
        statuses={view.statuses}
      />
    </IssueTableContext.Provider>
  );
}

function IssueTableLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2 p-4" role="status">
      <span className="sr-only">Loading issues</span>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export { IssueTablePanel };
