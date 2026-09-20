import { PlusIcon } from "lucide-react";

import { ProjectCards } from "./project-cards";
import { SearchToolbar } from "@/shared/components/search-toolbar";
import type { ProjectSummary } from "@teamos/shared";
import type { ProjectsState } from "../hooks/use-projects";

interface ProjectsPanelProps {
  onCreateProject: () => void;
  onManageMembers: (project: ProjectSummary) => void;
  state: ProjectsState;
}

function ProjectsPanel({ onCreateProject, onManageMembers, state }: ProjectsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <SearchToolbar
        action={{ icon: PlusIcon, label: "New project", onClick: onCreateProject }}
        isSearching={state.searchIsSettling}
        name="project-search"
        onSearchChange={state.setSearchInput}
        placeholder="Search projects"
        search={state.searchInput}
        searchLabel="Search projects"
      />
      <ProjectCards onManageMembers={onManageMembers} state={state} />
    </div>
  );
}

export { ProjectsPanel };
