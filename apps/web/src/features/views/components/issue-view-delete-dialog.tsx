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

function IssueViewDeleteDialog({
  name,
  onCancel,
  onConfirm,
  open,
}: {
  name: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}) {
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
          <AlertDialogTitle>Delete this view?</AlertDialogTitle>
          <AlertDialogDescription>
            {name === null
              ? "This removes the saved filters. Issues stay on the board."
              : `This removes “${name}”. Issues stay on the board.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep view</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive">
            <TrashIcon data-icon="inline-start" />
            Delete view
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { IssueViewDeleteDialog };
