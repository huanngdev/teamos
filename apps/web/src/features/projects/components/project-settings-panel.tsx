import {
  getProjectVisibilityLabel,
  parseProjectVisibility,
  projectVisibilities,
  projectVisibilityLabels,
} from "@teamos/shared";
import { ArrowLeftIcon, ArrowsClockwiseIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import { Link } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectSettingsState, ProjectSettingsView } from "../hooks/use-project-settings";
import { ProjectDangerZone } from "./project-danger-zone";

interface ProjectSettingsPanelProps {
  view: ProjectSettingsView;
}

type ProjectSettingsStatusState = Exclude<ProjectSettingsState, { status: "ready" | "redirect" }>;

interface ProjectSettingsStatusProps {
  state: ProjectSettingsStatusState;
}

function ProjectSettingsStatus({ state }: ProjectSettingsStatusProps) {
  if (state.status === "loading") {
    return (
      <div aria-busy="true" className="flex flex-col gap-4" role="status">
        <span className="sr-only">Loading project settings</span>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Project unavailable</AlertTitle>
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

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Project not found</EmptyTitle>
        <EmptyDescription>This project does not exist or you cannot view it.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link className={buttonVariants({ variant: "outline" })} to={state.projectsPath}>
          <ArrowLeftIcon data-icon="inline-start" />
          Projects
        </Link>
      </EmptyContent>
    </Empty>
  );
}

const projectSettingsFieldClassName =
  "grid grid-cols-1 @md/field-group:grid-cols-8 @md/field-group:items-start";

function ProjectSettingsPanel({ view }: ProjectSettingsPanelProps) {
  const isBusy = view.isSaving || view.isDeleting;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Name, description, and who can see this project.</CardDescription>
        </CardHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            view.onSave();
          }}
        >
          <CardContent>
            <FieldGroup className="my-4">
              <Field className={projectSettingsFieldClassName}>
                <FieldLabel htmlFor="project-settings-name">Name</FieldLabel>
                <FieldContent className="min-w-0 @md/field-group:col-span-7">
                  <Input
                    disabled={isBusy}
                    id="project-settings-name"
                    onChange={(event) => {
                      view.onNameChange(event.target.value);
                    }}
                    value={view.name}
                  />
                </FieldContent>
              </Field>
              <Field className={projectSettingsFieldClassName} data-disabled>
                <FieldLabel htmlFor="project-settings-slug">Slug</FieldLabel>
                <FieldContent className="min-w-0 @md/field-group:col-span-7">
                  <Input disabled id="project-settings-slug" value={view.slug} />
                </FieldContent>
              </Field>
              <Field className={projectSettingsFieldClassName}>
                <FieldLabel htmlFor="project-settings-description">Description</FieldLabel>
                <FieldContent className="min-w-0 @md/field-group:col-span-7">
                  <Textarea
                    disabled={isBusy}
                    id="project-settings-description"
                    onChange={(event) => {
                      view.onDescriptionChange(event.target.value);
                    }}
                    value={view.description}
                  />
                </FieldContent>
              </Field>
              <Field className={projectSettingsFieldClassName}>
                <FieldLabel htmlFor="project-settings-visibility">Visibility</FieldLabel>
                <FieldContent className="min-w-0 @md/field-group:col-span-7">
                  <Select
                    disabled={isBusy}
                    items={projectVisibilityLabels}
                    onValueChange={(value) => {
                      const visibility = parseProjectVisibility(value);

                      if (visibility !== undefined) {
                        view.onVisibilityChange(visibility);
                      }
                    }}
                    value={view.visibility}
                  >
                    <SelectTrigger
                      aria-label="Project visibility"
                      className="w-full"
                      id="project-settings-visibility"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start" alignItemWithTrigger={false} side="bottom">
                      <SelectGroup>
                        {projectVisibilities.map((visibility) => (
                          <SelectItem key={visibility} value={visibility}>
                            {getProjectVisibilityLabel(visibility)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Private projects are hidden until someone is granted a project role.
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>

            {view.saveErrorMessage === null ? null : (
              <Alert className="mt-4" variant="destructive">
                <AlertDescription>{view.saveErrorMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button disabled={!view.hasChanges || isBusy} type="submit">
              {view.isSaving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <FloppyDiskIcon data-icon="inline-start" />
              )}
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      {view.canDelete ? (
        <ProjectDangerZone
          confirmation={view.deleteConfirmation}
          errorMessage={view.deleteErrorMessage}
          isDeleteConfirmed={view.isDeleteConfirmed}
          isDeleteDialogOpen={view.deleteDialogOpen}
          isDeleting={view.isDeleting}
          onConfirmDelete={view.onConfirmDelete}
          onConfirmationChange={view.onDeleteConfirmationChange}
          onDeleteDialogOpenChange={view.onDeleteDialogOpenChange}
          projectName={view.projectName}
        />
      ) : null}
    </div>
  );
}

export { ProjectSettingsPanel, ProjectSettingsStatus };
