import { parseAssignableOrganizationRole, type AssignableOrganizationRole } from "@teamos/shared";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import type { InviteMemberFormState } from "../hooks/use-invite-member-form";

interface InviteMemberDialogProps {
  canAssignAdmin: boolean;
  form: InviteMemberFormState;
  onClose: () => void;
  open: boolean;
  organizationName: string;
}

const roleLabels: Record<AssignableOrganizationRole, string> = {
  admin: "Admin",
  member: "Member",
};

function InviteMemberDialog({
  canAssignAdmin,
  form,
  onClose,
  open,
  organizationName,
}: InviteMemberDialogProps) {
  const hasFieldError = form.fieldErrorMessage !== null;

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
    >
      <DialogContent>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            form.submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              Send an email invitation to join {organizationName}. You can grant project access
              after they accept.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={hasFieldError}>
              <FieldLabel htmlFor="invite-member-email">Email address</FieldLabel>
              <Input
                aria-invalid={hasFieldError}
                autoComplete="email"
                id="invite-member-email"
                name="email"
                onChange={(event) => {
                  form.setEmail(event.target.value);
                }}
                placeholder="teammate@example.com"
                type="email"
                value={form.email}
              />
              {hasFieldError ? <FieldDescription>{form.fieldErrorMessage}</FieldDescription> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-member-role">Workspace role</FieldLabel>
              <Select
                onValueChange={(value) => {
                  const role = parseAssignableOrganizationRole(value);

                  if (role !== undefined) {
                    form.setRole(role);
                  }
                }}
                value={form.role}
              >
                <SelectTrigger aria-label="Workspace role" id="invite-member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="member">{roleLabels.member}</SelectItem>
                    {canAssignAdmin ? (
                      <SelectItem value="admin">{roleLabels.admin}</SelectItem>
                    ) : null}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Ownership transfer is a separate flow, so the owner role is not offered here.
              </FieldDescription>
            </Field>
          </FieldGroup>

          {form.errorMessage === null ? null : (
            <Alert className="mt-4" variant="destructive">
              <AlertTitle>Invitation not sent</AlertTitle>
              <AlertDescription>{form.errorMessage}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button disabled={form.isPending} onClick={onClose} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={form.isPending || !form.isValid} type="submit">
              {form.isPending ? <Spinner data-icon="inline-start" /> : null}
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { InviteMemberDialog };
