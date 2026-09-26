import { PlusIcon } from "lucide-react";

import { SearchToolbar } from "@/shared/components/search-toolbar";
import { ProjectCards } from "./project-cards";
import type { ProjectsState } from "../hooks/use-projects";

interface ProjectsPanelProps {
  onCreateProject: () => void;
  organizationSlug: string;
  state: ProjectsState;
}

function ProjectsPanel({ onCreateProject, organizationSlug, state }: ProjectsPanelProps) {
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
      <ProjectCards organizationSlug={organizationSlug} state={state} />
    </div>
  );
}

export { ProjectsPanel };
