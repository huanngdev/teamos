import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { WorkspaceDangerZone } from "./workspace-danger-zone";
import type { WorkspaceSettingsView } from "../hooks/use-workspace-settings";
import { FloppyDiskIcon } from "@phosphor-icons/react";

interface WorkspaceSettingsPanelProps {
  view: WorkspaceSettingsView;
}

/*
 * Presentational workspace settings screen. Each setting is a two-column row
 * with the label on the left and its control on the right, and the danger zone
 * closes the screen for owners only.
 */
function WorkspaceSettingsPanel({ view }: WorkspaceSettingsPanelProps) {
  const isBusy = view.isRenaming || view.isDeleting;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>General configuration, privacy, and lifecycle controls</CardDescription>
        </CardHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            view.onSave();
          }}
        >
          <CardContent>
            <FieldGroup className="mb-4">
              <div className="grid gap-2 sm:grid-cols-3 sm:items-center">
                <FieldLabel htmlFor="workspace-settings-name">Name</FieldLabel>
                <div className="sm:col-span-2">
                  <Input
                    autoComplete="organization"
                    disabled={!view.canRename || isBusy}
                    id="workspace-settings-name"
                    onChange={(event) => {
                      view.onNameChange(event.target.value);
                    }}
                    value={view.draftName}
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 sm:items-center">
                <FieldLabel htmlFor="workspace-settings-slug">URL</FieldLabel>
                <div className="sm:col-span-2">
                  <Input disabled id="workspace-settings-slug" value={view.slug} />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 sm:items-center">
                <FieldLabel htmlFor="workspace-settings-members">Members</FieldLabel>
                <div className="sm:col-span-2">
                  <Input
                    disabled
                    id="workspace-settings-members"
                    value={String(view.memberCount)}
                  />
                </div>
              </div>
            </FieldGroup>

            {view.renameErrorMessage === null ? null : (
              <Alert className="mt-4" variant="destructive">
                <AlertDescription>{view.renameErrorMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button disabled={!view.hasNameChanges || isBusy} type="submit">
              {view.isRenaming ? (
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
        <WorkspaceDangerZone
          confirmation={view.deleteConfirmation}
          errorMessage={view.deleteErrorMessage}
          isDeleteConfirmed={view.isDeleteConfirmed}
          isDeleteDialogOpen={view.deleteDialogOpen}
          isDeleting={view.isDeleting}
          onConfirmDelete={view.onConfirmDelete}
          onConfirmationChange={view.onDeleteConfirmationChange}
          onDeleteDialogOpenChange={view.onDeleteDialogOpenChange}
          workspaceName={view.workspaceName}
        />
      ) : null}
    </div>
  );
}

export { WorkspaceSettingsPanel };
