import { Link } from "react-router";
import type { OrganizationSummary } from "@teamos/shared";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";

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

interface WorkspaceSwitcherProps {
  currentName: string;
  currentSlug: string;
  organizations: readonly OrganizationSummary[];
}

function WorkspaceSwitcher({ currentName, currentSlug, organizations }: WorkspaceSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Switch workspace, current workspace ${currentName}`}
            className="max-w-56 min-w-0 justify-start"
            variant="ghost"
          >
            <span className="min-w-0 truncate">{currentName}</span>
            <ChevronsUpDownIcon data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {organizations.map((organization) => (
            <DropdownMenuItem key={organization.id} render={<Link to={`/${organization.slug}`} />}>
              <span className="min-w-0 flex-1 truncate">{organization.name}</span>
              {organization.slug === currentSlug ? <CheckIcon className="ml-auto" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/new-workspace" />}>
            <PlusIcon data-icon="inline-start" />
            New workspace
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { WorkspaceSwitcher };
