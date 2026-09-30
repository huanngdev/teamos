import { ArrowUUpLeftIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react";

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

interface ProjectDangerZoneProps {
  confirmation: string;
  errorMessage: string | null;
  isDeleteConfirmed: boolean;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  onConfirmDelete: () => void;
  onConfirmationChange: (value: string) => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  projectName: string;
}

/*
 * Destructive project actions sit at the bottom of settings and are limited to
 * organization owners and admins. Deleting requires the exact stored name, and
 * the dialog stays open with the typed value until the request succeeds.
 */
function ProjectDangerZone({
  confirmation,
  errorMessage,
  isDeleteConfirmed,
  isDeleteDialogOpen,
  isDeleting,
  onConfirmDelete,
  onConfirmationChange,
  onDeleteDialogOpenChange,
  projectName,
}: ProjectDangerZoneProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/15 text-destructive">
            <WarningIcon className="size-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="font-medium">Deleting this project will also remove its issues</p>
            <p className="text-sm text-muted-foreground">
              Columns and cards are deleted with the project. Back up anything you want to keep.
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
          Delete project
        </Button>
      </div>

      <AlertDialog onOpenChange={onDeleteDialogOpenChange} open={isDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {projectName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the project, its columns, and its issues.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Field>
            <FieldLabel htmlFor="project-delete-confirmation">
              Type {projectName} to confirm
            </FieldLabel>
            <Input
              autoComplete="off"
              disabled={isDeleting}
              id="project-delete-confirmation"
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
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export { ProjectDangerZone };
