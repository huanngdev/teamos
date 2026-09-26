import { getInitials } from "@teamos/shared";
import { UserCircleIcon } from "@phosphor-icons/react";
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
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { accountProfilePath } from "../lib/account-paths";
import { CaretUpDownIcon, SignOutIcon } from "@phosphor-icons/react";

interface AccountMenuUser {
  email: string;
  image?: string | null;
  name: string;
}

interface AccountMenuProps {
  isSigningOut: boolean;
  onSignOut: () => void;
  user: AccountMenuUser;
  variant?: "icon" | "sidebar";
}

function AccountMenuContent({ isSigningOut, onSignOut, user }: Omit<AccountMenuProps, "variant">) {
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel className="flex min-w-0 flex-col">
          <span className="truncate">{user.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem render={<Link to={accountProfilePath} />}>
          <UserCircleIcon data-icon="inline-start" />
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
          <SignOutIcon data-icon="inline-start" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  );
}

/*
 * Only the actions TeamOS actually implements are listed. The sidebar variant
 * is the workspace footer identity and must render inside SidebarProvider.
 */
function AccountMenu({ isSigningOut, onSignOut, user, variant = "icon" }: AccountMenuProps) {
  const initials = getInitials(user.name) || getInitials(user.email);
  const content = (
    <AccountMenuContent isSigningOut={isSigningOut} onSignOut={onSignOut} user={user} />
  );

  if (variant === "sidebar") {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                aria-label="Open account menu"
                className="min-w-0"
                size="lg"
                tooltip={user.name}
              >
                <Avatar>
                  <AvatarImage alt="" src={user.image ?? undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </span>
                <CaretUpDownIcon className="ml-auto" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent align="start" className="w-56" side="top">
            {content}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

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
        {content}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { AccountMenu, type AccountMenuUser };
