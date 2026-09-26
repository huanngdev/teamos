import {
  getIssuePriorityLabel,
  issuePriorities,
  issuePriorityLabels,
  type ProjectMember,
  type ProjectStatusSummary,
} from "@teamos/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { UNASSIGNED, type IssueFormState } from "../hooks/use-issue-form";
import { DeleteIssueDialog } from "./delete-issue-dialog";
import { TrashIcon } from "@phosphor-icons/react";

interface IssueFormDialogProps {
  form: IssueFormState;
  members: readonly ProjectMember[];
  membersError: string | null;
  statuses: readonly ProjectStatusSummary[];
}

function IssueFormDialog({ form, members, membersError, statuses }: IssueFormDialogProps) {
  const statusItems = Object.fromEntries(statuses.map((status) => [status.id, status.name]));
  const assigneeItems = {
    [UNASSIGNED]: "Unassigned",
    ...Object.fromEntries(members.map((member) => [member.memberId, member.name])),
  };
  const open = form.mode !== "closed";

  return (
    <>
      <Dialog
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            form.reset();
          }
        }}
        open={open}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.mode === "edit" ? "Edit issue" : "New issue"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              form.submit();
            }}
          >
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
                  disabled={form.isReadOnly}
                  id="issue-description"
                  onChange={(event) => {
                    form.setDescription(event.target.value);
                  }}
                  value={form.description}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="issue-status">Column</FieldLabel>
                <Select
                  disabled={form.isReadOnly}
                  items={statusItems}
                  onValueChange={form.setStatusId}
                  value={form.statusId}
                >
                  <SelectTrigger id="issue-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="issue-priority">Priority</FieldLabel>
                <Select
                  disabled={form.isReadOnly}
                  items={issuePriorityLabels}
                  onValueChange={form.setPriority}
                  value={form.priority}
                >
                  <SelectTrigger id="issue-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {issuePriorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {getIssuePriorityLabel(priority)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="issue-assignee">Assignee</FieldLabel>
                <Select
                  disabled={form.isReadOnly || membersError !== null}
                  items={assigneeItems}
                  onValueChange={(value) => {
                    if (value !== null) {
                      form.setAssigneeMemberId(value);
                    }
                  }}
                  value={form.assigneeMemberId}
                >
                  <SelectTrigger id="issue-assignee">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.memberId} value={member.memberId}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {membersError === null ? null : (
                  <Alert className="mt-2" variant="destructive">
                    <AlertDescription>{membersError}</AlertDescription>
                  </Alert>
                )}
              </Field>
            </FieldGroup>
            {form.errorMessage === null ? null : (
              <Alert className="mb-4" variant="destructive">
                <AlertTitle>Issue not saved</AlertTitle>
                <AlertDescription>{form.errorMessage}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteIssueDialog form={form} />
    </>
  );
}

export { IssueFormDialog };
