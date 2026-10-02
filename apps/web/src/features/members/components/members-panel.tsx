import type { OrganizationRole } from "@teamos/shared";
import { UserPlusIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { InviteMemberDialog } from "./invite-member-dialog";
import { MemberList } from "./member-list";
import { PendingInvitations } from "./pending-invitations";
import { RemoveMemberDialog } from "./remove-member-dialog";
import type { WorkspaceMembersPanelView } from "../hooks/use-members-panel";
import { SearchToolbar } from "@/shared/components/search-toolbar";

interface MembersPanelProps {
  organizationName: string;
  view: WorkspaceMembersPanelView;
}

function MembersPanel({ organizationName, view }: MembersPanelProps) {
  const { members, permissions } = view;

  return (
    <div className="flex flex-col gap-4">
      <SearchToolbar
        action={
          permissions.canInviteMembers
            ? { icon: UserPlusIcon, label: "Invite member", onClick: view.invite.open }
            : undefined
        }
        isSearching={members.searchIsSettling}
        name="member-search"
        onSearchChange={members.setSearchInput}
        placeholder="Search members"
        search={members.searchInput}
        searchLabel="Search members"
      />

      <MemberList
        canManageMember={(role: OrganizationRole) => permissions.canManageMember(role)}
        currentUserId={view.currentUserId}
        onChangeRole={view.actions.changeRole}
        onRequestRemoval={view.actions.requestRemoval}
        pendingRoleMemberId={view.pendingRoleMemberId}
        state={members}
      />

      {members.pageCount > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Page {members.page + 1} of {members.pageCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              disabled={members.page === 0}
              onClick={() => {
                members.setPage(members.page - 1);
              }}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              disabled={members.page + 1 >= members.pageCount}
              onClick={() => {
                members.setPage(members.page + 1);
              }}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {permissions.canViewInvitations ? <PendingInvitations state={view.invitations} /> : null}

      <InviteMemberDialog
        canAssignAdmin={permissions.canAssignRole("admin")}
        form={view.invite.form}
        onClose={view.invite.close}
        open={view.invite.isOpen}
        organizationName={organizationName}
      />

      <RemoveMemberDialog
        isPending={view.removal.isPending}
        memberName={view.removal.memberName}
        onConfirm={view.removal.confirm}
        onOpenChange={(open) => {
          if (!open) {
            view.removal.dismiss();
          }
        }}
        open={view.removal.memberId !== null}
        organizationName={organizationName}
      />
    </div>
  );
}

export { MembersPanel };
