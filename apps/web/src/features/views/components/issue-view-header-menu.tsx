import { DotsThreeIcon, PencilIcon, TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function IssueViewHeaderMenu({ onDelete, onEdit }: { onDelete: () => void; onEdit: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button aria-label="View actions" size="icon" type="button" variant="ghost">
            <DotsThreeIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon data-icon="inline-start" />
            Edit view
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} variant="destructive">
            <TrashIcon data-icon="inline-start" />
            Delete view
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { IssueViewHeaderMenu };
