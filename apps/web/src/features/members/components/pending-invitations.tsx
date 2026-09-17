import type { OrganizationInvitation } from "@teamos/shared";
import { LoaderCircleIcon, MoreHorizontalIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PendingInvitationsState } from "../hooks/use-pending-invitations";

interface PendingInvitationsProps {
  state: PendingInvitationsState;
}

function formatExpiration(expiresAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(expiresAt));
}

/*
 * Pending invitations are not paginated, so they live in their own table below
 * the paginated member table. Role and expiry collapse into the invitee cell on
 * narrow screens and the two row actions move into one overflow menu.
 */
function PendingInvitations({ state }: PendingInvitationsProps) {
  if (state.errorMessage !== null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Pending invitations unavailable</AlertTitle>
        <AlertDescription>
          <span className="block">{state.errorMessage}</span>
          <Button
            className="mt-2"
            onClick={() => {
              void state.retry();
            }}
            variant="outline"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  /*
   * An empty pending list is the normal state, so the section stays quiet
   * instead of reserving space with a large empty card.
   */
  if (state.isPending || state.invitations.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Pending invitations</h3>
      {state.cancelError === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>{state.cancelError}</AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invitee</TableHead>
            <TableHead className="hidden sm:table-cell">Role</TableHead>
            <TableHead className="hidden sm:table-cell">Expires</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {state.invitations.map((invitation: OrganizationInvitation) => {
            const isResending = state.pendingResendId === invitation.id;
            const expiration = formatExpiration(invitation.expiresAt);

            return (
              <TableRow key={invitation.id}>
                <TableCell>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{invitation.email}</span>
                    <span className="text-xs text-muted-foreground sm:hidden">
                      Expires {expiration}
                    </span>
                    <Badge className="mt-1 self-start sm:hidden" variant="secondary">
                      {invitation.role}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="secondary">{invitation.role}</Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-muted-foreground">{expiration}</span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          aria-label={`Actions for the invitation to ${invitation.email}`}
                          size="icon"
                          variant="ghost"
                        >
                          {isResending ? (
                            <LoaderCircleIcon className="animate-spin" />
                          ) : (
                            <MoreHorizontalIcon />
                          )}
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>{invitation.email}</DropdownMenuLabel>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          disabled={isResending}
                          onClick={() => {
                            state.resend(invitation.id);
                          }}
                        >
                          <RefreshCwIcon data-icon="inline-start" />
                          Resend invitation
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            state.requestCancel(invitation.id);
                          }}
                          variant="destructive"
                        >
                          <Trash2Icon data-icon="inline-start" />
                          Cancel invitation
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            state.dismissCancel();
          }
        }}
        open={state.cancelTarget !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The link sent to {state.cancelTarget?.email ?? "this address"} stops working
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={state.confirmCancel} variant="destructive">
              Cancel invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export { PendingInvitations };
