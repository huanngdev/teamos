/* eslint-disable shadcn/no-restyle */
import { FloppyDiskIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import type { ProjectStatusSummary } from "@teamos/shared";
import { useRef } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { EligibleAssigneePicker } from "@/features/projects";
import type { IssueFormState } from "../hooks/use-issue-form";
import { IssueAssigneePicker } from "./issue-assignee-picker";
import { IssuePriorityPicker, IssueStatusPicker } from "./issue-field-pickers";
import { IssueTitleInput } from "./issue-title-input";

interface IssueFormDialogProps {
  assignees: EligibleAssigneePicker;
  form: IssueFormState;
  statuses: readonly ProjectStatusSummary[];
}

function IssueFormDialog({ assignees, form, statuses }: IssueFormDialogProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const open = form.mode !== "closed";
  const creating = form.mode !== "edit";

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.requestClose();
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-xl" initialFocus={titleRef}>
        <DialogHeader>
          <DialogTitle className="text-muted-foreground">
            {creating ? "New issue" : "Edit issue"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            form.submit();
          }}
        >
          <IssueTitleInput
            autoFocus
            error={form.titleError}
            disabled={form.isReadOnly}
            id={creating ? "issue-create-title" : "issue-edit-title"}
            inputRef={titleRef}
            label="Issue title"
            onChange={form.setTitle}
            placeholder="Issue title"
            value={form.title}
            variant="dialog"
          />
          <div className="flex flex-wrap gap-2 my-6">
            <IssuePriorityPicker
              disabled={form.isReadOnly}
              onChange={(priority) => {
                form.setPriority(priority);
              }}
              value={form.priority}
            />
            <IssueStatusPicker
              disabled={form.isReadOnly || statuses.length === 0}
              onChange={(statusId) => {
                form.setStatusId(statusId);
              }}
              statuses={statuses}
              value={form.statusId}
            />
            <IssueAssigneePicker
              disabled={form.isReadOnly}
              onSelect={form.setAssignees}
              picker={assignees}
              selected={form.selectedAssignees}
            />
          </div>
          {assignees.error === null ? null : (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{assignees.error}</AlertDescription>
            </Alert>
          )}
          {form.errorMessage === null ? null : (
            <Alert className="mt-4" variant="destructive">
              <AlertTitle>Issue not saved</AlertTitle>
              <AlertDescription>{form.errorMessage}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              disabled={form.isPending}
              onClick={form.requestClose}
              type="button"
              variant="outline"
            >
              <XIcon data-icon="inline-start" />
              Cancel
            </Button>
            {form.isReadOnly ? null : (
              <Button disabled={form.isPending || !form.isValid} type="submit">
                {form.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : creating ? (
                  <PlusIcon data-icon="inline-start" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                {creating ? "Create issue" : "Save issue"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { IssueFormDialog };
