import type { OrganizationRole } from "@teamos/shared";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { MemberTable, MemberTableHead } from "./member-table";
import type { WorkspaceMembersState } from "../hooks/use-workspace-members";

interface MemberListProps {
  canManageMember: (role: OrganizationRole) => boolean;
  currentUserId: string;
  onChangeRole: (memberId: string, role: "admin" | "member") => void;
  onRequestRemoval: (memberId: string) => void;
  pendingRoleMemberId: string | null;
  state: WorkspaceMembersState;
}

/* Reuses the real table head so the layout does not jump when rows arrive. */
function MemberListSkeleton() {
  return (
    <div aria-busy="true" role="status">
      <span className="sr-only">Loading members</span>
      <Table>
        <MemberTableHead />
        <TableBody>
          {[0, 1, 2].map((index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-10 w-48" />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-6 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto size-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MemberList({
  canManageMember,
  currentUserId,
  onChangeRole,
  onRequestRemoval,
  pendingRoleMemberId,
  state,
}: MemberListProps) {
  if (state.isPending) {
    return <MemberListSkeleton />;
  }

  if (state.errorMessage !== null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Members unavailable</AlertTitle>
        <AlertDescription>
          <span className="block">{state.errorMessage}</span>
          <Button className="mt-2" onClick={state.retry} variant="outline">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (state.members.length === 0) {
    const isSearching = state.searchInput.trim().length > 0;

    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{isSearching ? "No members match your search" : "No members yet"}</EmptyTitle>
          <EmptyDescription>
            {isSearching
              ? "Try a different name or email address."
              : "Members appear here after they accept an invitation."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div aria-busy={state.isFetching}>
      <MemberTable
        canManageMember={canManageMember}
        currentUserId={currentUserId}
        members={state.members}
        onChangeRole={onChangeRole}
        onRequestRemoval={onRequestRemoval}
        pendingRoleMemberId={pendingRoleMemberId}
      />
    </div>
  );
}

export { MemberList };
