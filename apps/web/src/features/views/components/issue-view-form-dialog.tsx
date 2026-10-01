import {
  getIssueViewVisibilityLabel,
  issueViewVisibilityLabels,
  issueViewVisibilitySchema,
} from "@teamos/shared";
import { FloppyDiskIcon, PlusIcon } from "@phosphor-icons/react";

import type { EligibleAssignee, ProjectStatusSummary } from "@teamos/shared";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { EligibleAssigneePicker } from "@/features/projects";
import type { IssueViewCatalog } from "../hooks/use-issue-view-catalog";
import type { IssueViewFormState } from "../hooks/use-issue-view-form";
import { IssueViewFilterFields } from "./issue-view-filter-fields";

const titles = {
  closed: "View",
  create: "New view",
  edit: "Edit view",
} as const;

function IssueViewFormDialog({
  assignees,
  catalog,
  errorMessage,
  form,
  knownAssignees,
  statuses,
}: {
  assignees: EligibleAssigneePicker;
  catalog: IssueViewCatalog;
  errorMessage: string | null;
  form: IssueViewFormState;
  knownAssignees: readonly EligibleAssignee[];
  statuses: readonly ProjectStatusSummary[];
}) {
  const message = form.errorMessage ?? errorMessage;

  return (
    <Sheet
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.reset();
        }
      }}
      open={form.mode !== "closed"}
    >
      <SheetContent className="w-full data-[side=right]:sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>{titles[form.mode]}</SheetTitle>
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
                <FieldLabel htmlFor="issue-view-name">Name</FieldLabel>
                <Input
                  id="issue-view-name"
                  onChange={(event) => {
                    form.setName(event.target.value);
                  }}
                  value={form.name}
                />
              </Field>
              {form.mode === "edit" ? (
                <Field>
                  <FieldLabel>Sharing</FieldLabel>
                  <p>{form.visibilityLabel}</p>
                </Field>
              ) : null}
              {form.showVisibility ? (
                <Field>
                  <FieldLabel htmlFor="issue-view-visibility">Sharing</FieldLabel>
                  <Select
                    items={issueViewVisibilityLabels}
                    onValueChange={form.setVisibility}
                    value={form.visibility}
                  >
                    <SelectTrigger id="issue-view-visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {issueViewVisibilitySchema.options.map((visibility) => (
                          <SelectItem key={visibility} value={visibility}>
                            {getIssueViewVisibilityLabel(visibility)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              {catalog.isPending ? (
                <div aria-busy="true" className="flex items-center gap-2" role="status">
                  <Spinner />
                  <span>Loading filters</span>
                </div>
              ) : (
                <IssueViewFilterFields
                  assignees={assignees}
                  form={form}
                  knownAssignees={knownAssignees}
                  options={{
                    categoryOptions: catalog.categoryOptions,
                    priorityOptions: catalog.priorityOptions,
                    statusOptions: catalog.statusOptions,
                  }}
                  statuses={statuses}
                />
              )}
              {catalog.statusError || catalog.membersError !== null ? (
                <Alert>
                  <AlertTitle>Some filters are unavailable</AlertTitle>
                  <AlertDescription>
                    {catalog.statusError ? "Columns could not be loaded." : catalog.membersError}
                  </AlertDescription>
                </Alert>
              ) : null}
              {message === null ? null : (
                <Alert variant="destructive">
                  <AlertTitle>Could not save the view</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </div>
          <SheetFooter>
            <Button disabled={!form.isValid || form.isPending} type="submit">
              {form.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : form.mode === "edit" ? (
                <FloppyDiskIcon data-icon="inline-start" />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              {form.mode === "edit" ? "Save changes" : "Create view"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export { IssueViewFormDialog };
