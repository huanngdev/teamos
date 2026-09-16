import { AuthCard } from "@/components/auth-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useCreateWorkspace } from "@/hooks/use-create-workspace";
import { useState } from "react";

function CreateWorkspacePage() {
  const [name, setName] = useState("");
  const { errorMessage, isPending, submitWorkspace } = useCreateWorkspace();

  return (
    <AuthCard
      description="Create a workspace for your team. You can invite members afterwards."
      title="Create a workspace"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submitWorkspace(name);
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            autoComplete="organization"
            id="workspace-name"
            onChange={(event) => {
              setName(event.target.value);
            }}
            placeholder="Acme Inc."
            value={name}
          />
        </div>

        {errorMessage === null ? null : (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Button disabled={isPending || name.trim() === ""} type="submit">
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          Create workspace
        </Button>
      </form>
    </AuthCard>
  );
}

export { CreateWorkspacePage };
