import { getInitials } from "@teamos/shared";
import { LogOutIcon } from "lucide-react";

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
 * Only the actions TeamOS actually implements are listed. Placeholder entries
 * for profile, billing, or support are intentionally omitted until those flows
 * exist.
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
