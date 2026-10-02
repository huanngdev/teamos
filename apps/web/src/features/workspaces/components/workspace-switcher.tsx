import { Link } from "react-router";
import type { OrganizationSummary } from "@teamos/shared";
import { Button } from "@/components/ui/button";
import { workspaceProjectsPath, workspacesNewPath } from "../lib/workspace-paths";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckIcon, CaretUpDownIcon, PlusIcon } from "@phosphor-icons/react";

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
            <CaretUpDownIcon data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {organizations.map((organization) => (
            <DropdownMenuItem
              key={organization.id}
              render={<Link to={workspaceProjectsPath(organization.slug)} />}
            >
              <span className="min-w-0 flex-1 truncate">{organization.name}</span>
              {organization.slug === currentSlug ? <CheckIcon className="ml-auto" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to={workspacesNewPath()} />}>
            <PlusIcon data-icon="inline-start" />
            New workspace
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { WorkspaceSwitcher };
