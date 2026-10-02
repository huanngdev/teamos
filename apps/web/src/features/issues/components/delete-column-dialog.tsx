import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { DeleteColumnState } from "../hooks/use-column-form";
import { TrashIcon } from "@phosphor-icons/react";

interface DeleteColumnDialogProps {
  state: DeleteColumnState;
}

function DeleteColumnDialog({ state }: DeleteColumnDialogProps) {
  return (
    <AlertDialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          state.cancel();
        }
      }}
      open={state.open}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {state.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {state.errorMessage ?? "Move every issue out of this column before deleting it."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep column</AlertDialogCancel>
          <AlertDialogAction
            disabled={state.isPending}
            onClick={state.confirm}
            variant="destructive"
          >
            <TrashIcon data-icon="inline-start" />
            Delete column
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { DeleteColumnDialog };
