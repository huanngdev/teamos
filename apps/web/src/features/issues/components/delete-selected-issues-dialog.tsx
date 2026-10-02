import { TrashIcon } from "@phosphor-icons/react";

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

interface DeleteSelectedIssuesDialogProps {
  count: number;
  error: string | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}

function DeleteSelectedIssuesDialog({
  count,
  error,
  isPending,
  onCancel,
  onConfirm,
  open,
}: DeleteSelectedIssuesDialogProps) {
  const noun = count === 1 ? "issue" : "issues";

  return (
    <AlertDialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
      open={open}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {count} {noun}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {error ??
              (count === 1
                ? "This permanently removes the issue from the board."
                : "This permanently removes the selected issues from the board.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep {noun}</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm} variant="destructive">
            <TrashIcon data-icon="inline-start" />
            Delete {noun}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { DeleteSelectedIssuesDialog };
