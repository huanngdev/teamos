import {
  getIssueStatusCategoryLabel,
  issueStatusCategories,
  issueStatusCategoryLabels,
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
import type { ColumnFormState } from "../hooks/use-column-form";

interface ColumnFormDialogProps {
  form: ColumnFormState;
}

function ColumnFormDialog({ form }: ColumnFormDialogProps) {
  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.reset();
        }
      }}
      open={form.mode !== "closed"}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.mode === "rename" ? "Rename column" : "Add column"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            form.submit();
          }}
        >
          <FieldGroup className="my-4">
            <Field>
              <FieldLabel htmlFor="column-name">Name</FieldLabel>
              <Input
                id="column-name"
                onChange={(event) => {
                  form.setName(event.target.value);
                }}
                value={form.name}
              />
            </Field>
            {form.mode === "create" ? (
              <Field>
                <FieldLabel htmlFor="column-category">Category</FieldLabel>
                <Select
                  items={issueStatusCategoryLabels}
                  onValueChange={form.setCategory}
                  value={form.category}
                >
                  <SelectTrigger id="column-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {issueStatusCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {getIssueStatusCategoryLabel(category)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </FieldGroup>
          {form.errorMessage === null ? null : (
            <Alert className="mb-4" variant="destructive">
              <AlertTitle>Column not saved</AlertTitle>
              <AlertDescription>{form.errorMessage}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button disabled={form.isPending} onClick={form.reset} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={form.isPending || !form.isValid} type="submit">
              {form.isPending ? <Spinner data-icon="inline-start" /> : null}
              {form.mode === "rename" ? "Save column" : "Add column"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ColumnFormDialog };
