import type { IssueCardSummary, ProjectStatusSummary } from "@teamos/shared";
import { create } from "zustand";

import { applyColumnMove, applyIssueMove } from "../lib/board-columns";

interface BoardSnapshot {
  issues: IssueCardSummary[];
  statuses: ProjectStatusSummary[];
  total: number;
}

interface BoardState {
  boards: Record<string, BoardSnapshot>;
  clear: () => void;
  moveColumn: (key: string, statusId: string, index: number) => void;
  moveIssue: (key: string, issueId: string, statusId: string, index: number) => void;
  setBoard: (key: string, board: BoardSnapshot) => void;
  setIssues: (key: string, issues: IssueCardSummary[], total: number) => void;
  setStatuses: (key: string, statuses: ProjectStatusSummary[]) => void;
}

function boardKey(slug: string, projectId: string): string {
  return `${slug}:${projectId}`;
}

const useBoardStore = create<BoardState>((set) => ({
  boards: {},
  clear: () => {
    set({ boards: {} });
  },
  moveColumn: (key, statusId, index) => {
    set((state) => {
      const board = state.boards[key];

      if (board === undefined) {
        return state;
      }

      return {
        boards: {
          ...state.boards,
          [key]: { ...board, statuses: applyColumnMove(board.statuses, statusId, index) },
        },
      };
    });
  },
  moveIssue: (key, issueId, statusId, index) => {
    set((state) => {
      const board = state.boards[key];

      if (board === undefined) {
        return state;
      }

      return {
        boards: {
          ...state.boards,
          [key]: { ...board, issues: applyIssueMove(board.issues, issueId, statusId, index) },
        },
      };
    });
  },
  setBoard: (key, board) => {
    set((state) => ({ boards: { ...state.boards, [key]: board } }));
  },
  setIssues: (key, issues, total) => {
    set((state) => ({
      boards: {
        ...state.boards,
        [key]: {
          issues,
          statuses: state.boards[key]?.statuses ?? [],
          total,
        },
      },
    }));
  },
  setStatuses: (key, statuses) => {
    set((state) => ({
      boards: {
        ...state.boards,
        [key]: {
          issues: state.boards[key]?.issues ?? [],
          statuses,
          total: state.boards[key]?.total ?? 0,
        },
      },
    }));
  },
}));

export { boardKey, useBoardStore };
