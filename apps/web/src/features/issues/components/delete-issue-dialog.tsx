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
import type { IssueFormState } from "../hooks/use-issue-form";
import { TrashIcon } from "@phosphor-icons/react";

interface DeleteIssueDialogProps {
  form: IssueFormState;
}

function DeleteIssueDialog({ form }: DeleteIssueDialogProps) {
  return (
    <AlertDialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.cancelDelete();
        }
      }}
      open={form.deleteOpen}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this issue?</AlertDialogTitle>
          <AlertDialogDescription>
            {form.deleteError ?? "This permanently removes the issue from the board."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep issue</AlertDialogCancel>
          <AlertDialogAction
            disabled={form.isPending}
            onClick={form.confirmDelete}
            variant="destructive"
          >
            <TrashIcon data-icon="inline-start" />
            Delete issue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { DeleteIssueDialog };
