import { getInitials } from "@teamos/shared";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AccountMenuUser {
  email: string;
  image?: string | null;
  name: string;
}

interface AccountMenuProps {
  isSigningOut: boolean;
  onSignOut: () => void;
  user: AccountMenuUser;
}

/*
 * Only sign-out has an implementation. The remaining entries mirror the
 * intended product surface and stay disabled until their flows exist.
 */
function AccountMenu({ isSigningOut, onSignOut, user }: AccountMenuProps) {
  const initials = getInitials(user.name) || getInitials(user.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button aria-label="Open account menu" size="icon" variant="ghost">
            <Avatar>
              <AvatarImage alt="" src={user.image ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuItem disabled>Profile</DropdownMenuItem>
          <DropdownMenuItem disabled>Billing</DropdownMenuItem>
          <DropdownMenuItem disabled>Settings</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>Team</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled>Invite users</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled>Email</DropdownMenuItem>
                <DropdownMenuItem disabled>Message</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>More...</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem disabled>New Team</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>GitHub</DropdownMenuItem>
          <DropdownMenuItem disabled>Support</DropdownMenuItem>
          <DropdownMenuItem disabled>API</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={isSigningOut}
            onClick={() => {
              onSignOut();
            }}
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { AccountMenu, type AccountMenuUser };
