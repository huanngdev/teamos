import type {
  AuthenticatedSession,
  AuthenticatedUser,
  OrganizationContext,
  OrganizationSummary,
  ProjectMember,
  ProjectSummary,
} from "@teamos/shared";
import { create } from "zustand";

interface ShellSession {
  session: AuthenticatedSession;
  user: AuthenticatedUser;
}

interface ShellState {
  clear: () => void;
  clearMembers: (slug: string, projectId: string) => void;
  clearProjects: (slug: string) => void;
  members: Record<string, ProjectMember[]>;
  organizations: OrganizationSummary[] | null;
  projects: Record<string, ProjectSummary[]>;
  removeWorkspace: (slug: string) => void;
  session: ShellSession | null;
  setMembers: (slug: string, projectId: string, members: ProjectMember[]) => void;
  setOrganizations: (organizations: OrganizationSummary[]) => void;
  setProjects: (slug: string, projects: ProjectSummary[]) => void;
  setSession: (session: ShellSession) => void;
  setWorkspace: (slug: string, workspace: OrganizationContext) => void;
  workspaces: Record<string, OrganizationContext>;
}

function memberCacheKey(slug: string, projectId: string): string {
  return `${slug}:${projectId}`;
}

const useShellStore = create<ShellState>((set) => ({
  clear: () => {
    set({
      members: {},
      organizations: null,
      projects: {},
      session: null,
      workspaces: {},
    });
  },
  clearMembers: (slug, projectId) => {
    set((state) => {
      const next = { ...state.members };
      delete next[memberCacheKey(slug, projectId)];

      return { members: next };
    });
  },
  clearProjects: (slug) => {
    set((state) => {
      const next = { ...state.projects };
      delete next[slug];

      return { projects: next };
    });
  },
  members: {},
  organizations: null,
  projects: {},
  removeWorkspace: (slug) => {
    set((state) => {
      const workspaces = { ...state.workspaces };
      const removed = workspaces[slug];
      delete workspaces[slug];

      return {
        organizations:
          state.organizations === null || removed === undefined
            ? state.organizations
            : state.organizations.filter((item) => item.id !== removed.id),
        projects: Object.fromEntries(
          Object.entries(state.projects).filter(([key]) => key !== slug),
        ),
        workspaces,
      };
    });
  },
  session: null,
  setMembers: (slug, projectId, members) => {
    set((state) => ({
      members: { ...state.members, [memberCacheKey(slug, projectId)]: members },
    }));
  },
  setOrganizations: (organizations) => {
    set({ organizations });
  },
  setProjects: (slug, projects) => {
    set((state) => ({ projects: { ...state.projects, [slug]: projects } }));
  },
  setSession: (session) => {
    set({ session });
  },
  setWorkspace: (slug, workspace) => {
    set((state) => ({
      organizations:
        state.organizations === null
          ? state.organizations
          : state.organizations.map((item) =>
              item.id === workspace.id ? { ...item, name: workspace.name } : item,
            ),
      workspaces: { ...state.workspaces, [slug]: workspace },
    }));
  },
  workspaces: {},
}));

export { memberCacheKey, useShellStore };
