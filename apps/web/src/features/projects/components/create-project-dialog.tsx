import { parseProjectVisibility } from "@teamos/shared";

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
import type { CreateProjectFormState } from "../hooks/use-create-project-form";

interface CreateProjectDialogProps {
  form: CreateProjectFormState;
  onClose: () => void;
  open: boolean;
}

function CreateProjectDialog({ form, onClose, open }: CreateProjectDialogProps) {
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
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              You become the project lead. Workspace members can see it unless you make it private.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="my-4">
            <Field>
              <FieldLabel htmlFor="create-project-name">Name</FieldLabel>
              <Input
                autoComplete="off"
                id="create-project-name"
                name="name"
                onChange={(event) => {
                  form.setName(event.target.value);
                }}
                placeholder="Apollo"
                value={form.name}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="create-project-visibility">Visibility</FieldLabel>
              <Select
                onValueChange={(value) => {
                  const visibility = parseProjectVisibility(value);

                  if (visibility !== undefined) {
                    form.setVisibility(visibility);
                  }
                }}
                value={form.visibility}
              >
                <SelectTrigger aria-label="Project visibility" id="create-project-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="workspace">Workspace</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Private projects are hidden until someone is granted a project role.
              </FieldDescription>
            </Field>
          </FieldGroup>

          {form.errorMessage === null ? null : (
            <Alert className="mt-4" variant="destructive">
              <AlertTitle>Project not created</AlertTitle>
              <AlertDescription>{form.errorMessage}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button disabled={form.isPending} onClick={onClose} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={form.isPending || !form.isValid} type="submit">
              {form.isPending ? <Spinner data-icon="inline-start" /> : null}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { CreateProjectDialog };
