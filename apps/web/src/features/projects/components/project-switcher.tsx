import type { ProjectSummary } from "@teamos/shared";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { Link } from "react-router";

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
import { projectOverviewPath } from "../lib/project-paths";

interface ProjectSwitcherProps {
  currentName: string;
  currentSlug: string;
  onCreate: () => void;
  organizationSlug: string;
  projects: readonly ProjectSummary[];
}

function ProjectSwitcher({
  currentName,
  currentSlug,
  onCreate,
  organizationSlug,
  projects,
}: ProjectSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Switch project, current project ${currentName}`}
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
          <DropdownMenuLabel>Projects</DropdownMenuLabel>
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              render={<Link to={projectOverviewPath(organizationSlug, project.slug)} />}
            >
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
              {project.slug === currentSlug ? <CheckIcon className="ml-auto" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onCreate}>
            <PlusIcon data-icon="inline-start" />
            New project
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ProjectSwitcher };
