import { getInitials } from "@teamos/shared";
import { LogOutIcon, UserRoundIcon } from "lucide-react";
import { Link } from "react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { accountProfilePath } from "../lib/account-paths";

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
 * Only the actions TeamOS actually implements are listed. The profile entry
 * links to the identity-scoped account page, and destructive sign-out stays in
 * its own group below a separator.
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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex min-w-0 flex-col">
            <span className="truncate">{user.name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to={accountProfilePath} />}>
            <UserRoundIcon data-icon="inline-start" />
            Profile
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={isSigningOut}
            onClick={() => {
              onSignOut();
            }}
            variant="destructive"
          >
            <LogOutIcon data-icon="inline-start" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { AccountMenu, type AccountMenuUser };
