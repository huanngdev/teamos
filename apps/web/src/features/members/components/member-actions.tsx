import type { OrganizationMember } from "@teamos/shared";
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
import { DotsThreeOutlineIcon } from "@phosphor-icons/react";

interface MemberActionsProps {
  canChangeRole: boolean;
  canRemove: boolean;
  isChangingRole: boolean;
  member: OrganizationMember;
  onChangeRole: (memberId: string, role: "admin" | "member") => void;
  onRequestRemoval: (memberId: string) => void;
}

function MemberActions({
  canChangeRole,
  canRemove,
  isChangingRole,
  member,
  onChangeRole,
  onRequestRemoval,
}: MemberActionsProps) {
  if (!canChangeRole && !canRemove) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Actions for ${member.name}`}
            disabled={isChangingRole}
            size="icon"
            variant="ghost"
          >
            <DotsThreeOutlineIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{member.name}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={!canChangeRole || member.role === "member"}
            onClick={() => {
              onChangeRole(member.id, "member");
            }}
          >
            Set as member
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canChangeRole || member.role === "admin"}
            onClick={() => {
              onChangeRole(member.id, "admin");
            }}
          >
            Set as admin
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {canRemove ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  onRequestRemoval(member.id);
                }}
                variant="destructive"
              >
                Remove from workspace
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { MemberActions };
