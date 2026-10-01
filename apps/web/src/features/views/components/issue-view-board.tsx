import { ArrowsClockwiseIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ColumnFormDialog,
  DeleteColumnDialog,
  IssueBoardCanvas,
  IssueBoardLoading,
  IssueFormDialog,
} from "@/features/issues";
import { useIssueViewDrag } from "../hooks/use-issue-view-drag";
import type { IssueViewBoardState } from "../hooks/use-issue-view-board";
import { IssueViewDeleteDialog } from "./issue-view-delete-dialog";
import { IssueViewFormDialog } from "./issue-view-form-dialog";

function IssueViewBoard({ state }: { state: IssueViewBoardState }) {
  if (state.status === "loading") {
    return <IssueBoardLoading />;
  }

  if (state.status === "not-found") {
    return (
      <Alert>
        <AlertTitle>View not found</AlertTitle>
        <AlertDescription>This view is not available in the project.</AlertDescription>
      </Alert>
    );
  }

  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>View unavailable</AlertTitle>
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

  return <IssueViewBoardReady view={state.view} />;
}

function IssueViewBoardReady({
  view,
}: {
  view: Extract<IssueViewBoardState, { status: "ready" }>["view"];
}) {
  const drag = useIssueViewDrag({
    columns: view.columns,
    onMoveColumn: view.onMoveColumn,
    onMoveStatus: view.onMoveStatus,
  });

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        {view.stale ? (
          <Alert>
            <AlertTitle>A saved filter no longer matches</AlertTitle>
            <AlertDescription>
              A column or member in this view is gone. The view stays narrow until you update the
              filters.
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="min-h-0 flex-1">
          <IssueBoardCanvas
            canCreateIssue={view.canCreateIssue}
            canUpdateIssue={view.canUpdateIssue}
            canUpdateProject={view.canUpdateProject}
            drag={drag}
            members={view.catalog.members}
            onCreateColumn={view.onCreateColumn}
            onCreateIssue={view.onCreateIssue}
            onDeleteColumn={view.onDeleteColumn}
            onEditIssue={view.onEditIssue}
            onLoadMore={view.onLoadMore}
            onLoadPrevious={view.onLoadPrevious}
            onRenameColumn={view.onRenameColumn}
            truncated={view.truncated}
          />
        </div>
      </div>
      <IssueFormDialog
        assignees={view.assignees}
        form={view.issueForm}
        statuses={view.catalog.statuses}
      />
      <ColumnFormDialog form={view.columnForm} />
      <DeleteColumnDialog state={view.deleteColumn} />
      <IssueViewFormDialog
        assignees={view.viewAssignees}
        catalog={view.catalog}
        errorMessage={view.formError}
        form={view.form}
        knownAssignees={view.knownAssignees}
        statuses={view.catalog.statuses}
      />
      <IssueViewDeleteDialog
        name={view.name}
        onCancel={view.onCancelDelete}
        onConfirm={view.onDelete}
        open={view.deleteOpen}
      />
    </>
  );
}

export { IssueViewBoard };
