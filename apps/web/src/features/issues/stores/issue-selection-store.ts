import { create } from "zustand";

interface IssueSelectionState {
  clear: (key: string) => void;
  selected: Record<string, Record<string, true>>;
  toggle: (key: string, issueId: string, selected: boolean) => void;
  toggleMany: (key: string, issueIds: readonly string[], selected: boolean) => void;
}

function selectionKey(organizationSlug: string, projectId: string): string {
  return `${organizationSlug}:${projectId}`;
}

function withSelection(
  current: Record<string, true> | undefined,
  issueIds: readonly string[],
  selected: boolean,
): Record<string, true> {
  const next = { ...current };

  for (const issueId of issueIds) {
    if (selected) {
      next[issueId] = true;
    } else {
      delete next[issueId];
    }
  }

  return next;
}

const useIssueSelectionStore = create<IssueSelectionState>((set) => ({
  clear: (key) => {
    set((state) => {
      if (state.selected[key] === undefined) {
        return state;
      }

      const selected = { ...state.selected };
      delete selected[key];

      return { selected };
    });
  },
  selected: {},
  toggle: (key, issueId, selected) => {
    set((state) => ({
      selected: {
        ...state.selected,
        [key]: withSelection(state.selected[key], [issueId], selected),
      },
    }));
  },
  toggleMany: (key, issueIds, selected) => {
    set((state) => ({
      selected: {
        ...state.selected,
        [key]: withSelection(state.selected[key], issueIds, selected),
      },
    }));
  },
}));

export { selectionKey, useIssueSelectionStore };
