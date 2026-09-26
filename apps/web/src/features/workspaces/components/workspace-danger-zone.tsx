import { ArrowUUpLeftIcon } from "@phosphor-icons/react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TrashIcon, WarningIcon } from "@phosphor-icons/react";

interface WorkspaceDangerZoneProps {
  confirmation: string;
  errorMessage: string | null;
  isDeleteConfirmed: boolean;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  onConfirmDelete: () => void;
  onConfirmationChange: (value: string) => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  workspaceName: string;
}

/*
 * Destructive workspace actions live at the bottom of the settings screen and
 * are owner-only. Deleting requires typing the exact workspace name, and the
 * dialog stays open with the typed value until the request succeeds.
 */
function WorkspaceDangerZone({
  confirmation,
  errorMessage,
  isDeleteConfirmed,
  isDeleteDialogOpen,
  isDeleting,
  onConfirmDelete,
  onConfirmationChange,
  onDeleteDialogOpenChange,
  workspaceName,
}: WorkspaceDangerZoneProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/15 text-destructive">
            <WarningIcon className="size-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="font-medium">Deleting this workspace will also remove its projects</p>
            <p className="text-sm text-muted-foreground">
              Back up anything you want to keep before deleting.
            </p>
          </div>
        </div>
        <Button
          className="self-start"
          onClick={() => {
            onDeleteDialogOpenChange(true);
          }}
          variant="destructive"
        >
          <TrashIcon data-icon="inline-start" />
          Delete workspace
        </Button>
      </div>

      <AlertDialog onOpenChange={onDeleteDialogOpenChange} open={isDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {workspaceName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the workspace, its projects, and its members.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Field>
            <FieldLabel htmlFor="workspace-delete-confirmation">
              Type {workspaceName} to confirm
            </FieldLabel>
            <Input
              autoComplete="off"
              disabled={isDeleting}
              id="workspace-delete-confirmation"
              onChange={(event) => {
                onConfirmationChange(event.target.value);
              }}
              value={confirmation}
            />
          </Field>

          {errorMessage === null ? null : (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              <ArrowUUpLeftIcon data-icon="inline-start" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!isDeleteConfirmed || isDeleting}
              onClick={onConfirmDelete}
              variant="destructive"
            >
              {isDeleting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <TrashIcon data-icon="inline-start" />
              )}
              Delete workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export { WorkspaceDangerZone };
