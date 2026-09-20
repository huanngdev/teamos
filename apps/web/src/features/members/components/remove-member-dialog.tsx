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
import { Spinner } from "@/components/ui/spinner";

interface RemoveMemberDialogProps {
  isPending: boolean;
  memberName: string | null;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationName: string;
}

function RemoveMemberDialog({
  isPending,
  memberName,
  onConfirm,
  onOpenChange,
  open,
  organizationName,
}: RemoveMemberDialogProps) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {memberName ?? "this member"}?</AlertDialogTitle>
          <AlertDialogDescription>
            They immediately lose access to {organizationName} and to every project in it. You can
            invite them again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep member</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm} variant="destructive">
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Remove member
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { RemoveMemberDialog };
