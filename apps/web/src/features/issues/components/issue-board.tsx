import { ArrowsClockwiseIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useIssueBoardDrag } from "../hooks/use-issue-board-drag";
import type { IssueBoardState } from "../hooks/use-issue-board";
import { ColumnFormDialog } from "./column-form-dialog";
import { DeleteColumnDialog } from "./delete-column-dialog";
import { IssueBoardCanvas, IssueBoardLoading } from "./issue-board-canvas";
import { IssueFormDialog } from "./issue-form-dialog";

interface IssueBoardProps {
  state: IssueBoardState;
}

function IssueBoard({ state }: IssueBoardProps) {
  if (state.status === "loading") {
    return <IssueBoardLoading />;
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
        <AlertTitle>Board unavailable</AlertTitle>
        <AlertDescription>
          <span className="block">{state.message}</span>
          <Button className="mt-2" onClick={state.retry} variant="outline">
            <ArrowsClockwiseIcon data-icon="inline-start" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <IssueBoardReady view={state.view} />;
}

function IssueBoardReady({
  view,
}: {
  view: Extract<IssueBoardState, { status: "ready" }>["view"];
}) {
  const drag = useIssueBoardDrag({
    columns: view.columns,
    onDrop: view.onDrop,
  });

  return (
    <>
      <IssueBoardCanvas
        canCreateIssue={view.canCreateIssue}
        canUpdateIssue={view.canUpdateIssue}
        canReorderColumns={view.canUpdateProject}
        canUpdateProject={view.canUpdateProject}
        drag={drag}
        highlightedIssueId={view.highlightedIssueId}
        onCreateColumn={view.onCreateColumn}
        onCreateIssue={view.onCreateIssue}
        onDeleteColumn={view.onDeleteColumn}
        onEditIssue={view.onEditIssue}
        onLoadMore={view.onLoadMore}
        onLoadPrevious={view.onLoadPrevious}
        onRenameColumn={view.onRenameColumn}
        truncated={view.truncated}
      />
      <p aria-live="polite" className="sr-only">
        {view.createdMessage}
      </p>
      <IssueFormDialog
        assignees={view.assignees}
        form={view.issueForm}
        statuses={view.columns.map((column) => column.status)}
      />
      <ColumnFormDialog form={view.columnForm} />
      <DeleteColumnDialog state={view.deleteColumn} />
    </>
  );
}

export { IssueBoard };
