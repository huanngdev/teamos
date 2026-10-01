import type { ProjectStatusSummary } from "@teamos/shared";
import { ArrowsClockwiseIcon, TrashIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { EligibleAssigneePicker } from "@/features/projects";
import type { IssueFormState } from "../hooks/use-issue-form";
import { DeleteIssueDialog } from "./delete-issue-dialog";
import { IssueAssigneePicker } from "./issue-assignee-picker";
import { IssuePriorityPicker, IssueStatusPicker } from "./issue-field-pickers";

interface IssueFormDialogProps {
  assignees: EligibleAssigneePicker;
  form: IssueFormState;
  statuses: readonly ProjectStatusSummary[];
}

function IssueFormDialog({ assignees, form, statuses }: IssueFormDialogProps) {
  const open = form.mode !== "closed";
  const waitingForDetail = form.mode === "edit" && !form.detailReady;

  return (
    <>
      <Sheet
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            form.reset();
          }
        }}
        open={open}
      >
        <SheetContent className="w-full data-[side=right]:sm:max-w-md" side="right">
          <SheetHeader>
            <SheetTitle>{form.mode === "edit" ? "Edit issue" : "New issue"}</SheetTitle>
          </SheetHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              form.submit();
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-4">
              <FieldGroup className="my-4">
                <Field>
                  <FieldLabel htmlFor="issue-title">Title</FieldLabel>
                  <Input
                    disabled={form.isReadOnly}
                    id="issue-title"
                    onChange={(event) => {
                      form.setTitle(event.target.value);
                    }}
                    value={form.title}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="issue-description">Description</FieldLabel>
                  <Textarea
                    disabled={form.isReadOnly || waitingForDetail}
                    id="issue-description"
                    onChange={(event) => {
                      form.setDescription(event.target.value);
                    }}
                    value={form.description}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <IssueStatusPicker
                    disabled={form.isReadOnly || statuses.length === 0}
                    onChange={(statusId) => {
                      form.setStatusId(statusId);
                    }}
                    statuses={statuses}
                    value={form.statusId}
                  />
                  <IssuePriorityPicker
                    disabled={form.isReadOnly}
                    onChange={(priority) => {
                      form.setPriority(priority);
                    }}
                    value={form.priority}
                  />
                  <IssueAssigneePicker
                    disabled={form.isReadOnly}
                    onSelect={form.setAssignee}
                    picker={assignees}
                    selected={form.assignee}
                  />
                </div>
              </FieldGroup>
              {form.detailError === null ? null : (
                <Alert className="mb-4" variant="destructive">
                  <AlertTitle>Issue details unavailable</AlertTitle>
                  <AlertDescription>
                    <span className="block">{form.detailError}</span>
                    <Button
                      className="mt-2"
                      onClick={form.retryDetail}
                      type="button"
                      variant="outline"
                    >
                      <ArrowsClockwiseIcon data-icon="inline-start" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {assignees.error === null ? null : (
                <Alert className="mb-4" variant="destructive">
                  <AlertDescription>{assignees.error}</AlertDescription>
                </Alert>
              )}
              {form.errorMessage === null ? null : (
                <Alert className="mb-4" variant="destructive">
                  <AlertTitle>Issue not saved</AlertTitle>
                  <AlertDescription>{form.errorMessage}</AlertDescription>
                </Alert>
              )}
            </div>
            <SheetFooter>
              {form.canDelete ? (
                <Button onClick={form.requestDelete} type="button" variant="destructive">
                  <TrashIcon data-icon="inline-start" />
                  Delete
                </Button>
              ) : null}
              <Button
                disabled={form.isPending}
                onClick={form.reset}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              {form.isReadOnly ? null : (
                <Button disabled={form.isPending || !form.isValid} type="submit">
                  {form.isPending ? <Spinner data-icon="inline-start" /> : null}
                  {form.mode === "edit" ? "Save issue" : "Create issue"}
                </Button>
              )}
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      <DeleteIssueDialog form={form} />
    </>
  );
}

export { IssueFormDialog };
