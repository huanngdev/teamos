import { create } from "zustand";

interface IssueViewHeaderActions {
  canManage: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

interface IssueViewHeaderStore {
  actions: IssueViewHeaderActions | null;
  clear: () => void;
  setActions: (actions: IssueViewHeaderActions) => void;
}

const useIssueViewHeaderStore = create<IssueViewHeaderStore>((set) => ({
  actions: null,
  clear: () => {
    set({ actions: null });
  },
  setActions: (actions) => {
    set({ actions });
  },
}));

export { useIssueViewHeaderStore, type IssueViewHeaderActions };
