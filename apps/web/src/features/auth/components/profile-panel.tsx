import { ArrowUUpLeftIcon } from "@phosphor-icons/react";
import { getInitials } from "@teamos/shared";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { ProfileView } from "../hooks/use-profile-form";
import { FloppyDiskIcon } from "@phosphor-icons/react";

interface ProfilePanelProps {
  view: ProfileView;
}

/*
 * Presentational profile screen. Identity is read-only; the only editable field
 * is the display name, so the form keeps a single control and a single save
 * action.
 */
function ProfilePanel({ view }: ProfilePanelProps) {
  const initials = getInitials(view.user.name) || getInitials(view.user.email);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your personal account information.</CardDescription>
      </CardHeader>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          view.onSave();
        }}
      >
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarImage alt="" src={view.user.image ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{view.user.name}</span>
              <span className="truncate text-sm text-muted-foreground">{view.user.email}</span>
            </div>
          </div>

          <FieldGroup className="my-4">
            <Field data-invalid={view.nameError !== null}>
              <FieldLabel htmlFor="profile-name">Display name</FieldLabel>
              <Input
                aria-invalid={view.nameError !== null}
                autoComplete="name"
                disabled={view.isSaving}
                id="profile-name"
                onChange={(event) => {
                  view.onNameChange(event.target.value);
                }}
                value={view.draftName}
              />
              {view.nameError === null ? null : <FieldError>{view.nameError}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-email">Email</FieldLabel>
              <Input disabled id="profile-email" value={view.user.email} />
              <FieldDescription>Email changes are not available yet.</FieldDescription>
            </Field>
          </FieldGroup>

          {view.errorMessage === null ? null : (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{view.errorMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <div className="flex items-center gap-2">
            <Button
              disabled={!view.canCancel}
              onClick={view.onCancel}
              type="button"
              variant="outline"
            >
              <ArrowUUpLeftIcon data-icon="inline-start" />
              Cancel
            </Button>
            <Button disabled={!view.canSave} type="submit">
              {view.isSaving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <FloppyDiskIcon data-icon="inline-start" />
              )}
              Save changes
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export { ProfilePanel };
