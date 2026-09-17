import { getInitials, type OrganizationMember, type OrganizationRole } from "@teamos/shared";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface MemberIdentityProps {
  member: OrganizationMember;
}

function MemberRoleBadge({ role }: { role: OrganizationRole }) {
  return <Badge variant="secondary">{role}</Badge>;
}

/*
 * Avatar, name, and email for one member. On narrow screens the role badge is
 * shown here instead of in its own column so the table never needs horizontal
 * scrolling; `sm:hidden` keeps assistive technology from reading it twice.
 */
function MemberIdentity({ member }: MemberIdentityProps) {
  const initials = getInitials(member.name) || getInitials(member.email);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar>
        <AvatarImage alt="" src={member.image ?? undefined} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{member.name}</span>
        <span className="truncate text-xs text-muted-foreground">{member.email}</span>
        <Badge className="mt-1 self-start sm:hidden" variant="secondary">
          {member.role}
        </Badge>
      </div>
    </div>
  );
}

export { MemberIdentity, MemberRoleBadge };
