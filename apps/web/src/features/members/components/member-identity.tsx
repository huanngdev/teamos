import {
  capitalize,
  getInitials,
  type OrganizationMember,
  type OrganizationRole,
} from "@teamos/shared";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MemberIdentityProps {
  member: OrganizationMember;
}

/* Roles are stored lowercase, so they are capitalized once here for display. */
function MemberRole({ role }: { role: OrganizationRole }) {
  return <span className="text-sm">{capitalize(role)}</span>;
}

/*
 * Avatar, name, and email for one member. On narrow screens the role is shown
 * here instead of in its own column so the table never needs horizontal
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
        <span className="mt-0.5 sm:hidden">
          <MemberRole role={member.role} />
        </span>
      </div>
    </div>
  );
}

export { MemberIdentity, MemberRole };
