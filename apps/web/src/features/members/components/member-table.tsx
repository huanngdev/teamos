import type { OrganizationMember } from "@teamos/shared";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MemberActions } from "./member-actions";
import { MemberIdentity, MemberRoleBadge } from "./member-identity";

/*
 * `Member` and `Actions` are always visible. The role column collapses on narrow
 * screens, where the role moves under the member's email, so the table never
 * needs horizontal scrolling.
 */
function MemberTableHead() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Member</TableHead>
        <TableHead className="hidden sm:table-cell">Role</TableHead>
        <TableHead className="text-right">
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

interface MemberTableProps {
  canManageMember: (role: OrganizationMember["role"]) => boolean;
  currentUserId: string;
  members: readonly OrganizationMember[];
  onChangeRole: (memberId: string, role: "admin" | "member") => void;
  onRequestRemoval: (memberId: string) => void;
  pendingRoleMemberId: string | null;
}

function MemberTable({
  canManageMember,
  currentUserId,
  members,
  onChangeRole,
  onRequestRemoval,
  pendingRoleMemberId,
}: MemberTableProps) {
  return (
    <Table>
      <MemberTableHead />
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <MemberIdentity member={member} />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <MemberRoleBadge role={member.role} />
            </TableCell>
            <TableCell className="text-right">
              <MemberActions
                canChangeRole={canManageMember(member.role)}
                canRemove={canManageMember(member.role) && member.userId !== currentUserId}
                isChangingRole={pendingRoleMemberId === member.id}
                member={member}
                onChangeRole={onChangeRole}
                onRequestRemoval={onRequestRemoval}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export { MemberTable, MemberTableHead };
