import type { IssueSummary, ProjectStatusSummary } from "@teamos/shared";
import { create } from "zustand";

import { applyIssueMove } from "../lib/board-columns";

interface BoardSnapshot {
  issues: IssueSummary[];
  statuses: ProjectStatusSummary[];
  total: number;
}

interface BoardState {
  boards: Record<string, BoardSnapshot>;
  clear: () => void;
  moveColumn: (key: string, statusId: string, index: number) => void;
  moveIssue: (key: string, issueId: string, statusId: string, index: number) => void;
  setBoard: (key: string, board: BoardSnapshot) => void;
  setIssues: (key: string, issues: IssueSummary[], total: number) => void;
  setStatuses: (key: string, statuses: ProjectStatusSummary[]) => void;
}

function boardKey(slug: string, projectId: string): string {
  return `${slug}:${projectId}`;
}

function applyColumnMove(
  statuses: readonly ProjectStatusSummary[],
  statusId: string,
  index: number,
): ProjectStatusSummary[] {
  const ordered = [...statuses].sort(
    (left, right) => left.position - right.position || left.id.localeCompare(right.id),
  );
  const moving = ordered.find((status) => status.id === statusId);

  if (moving === undefined) {
    return ordered;
  }

  const rest = ordered.filter((status) => status.id !== statusId);
  const clamped = Math.min(Math.max(index, 0), rest.length);
  const next = [...rest.slice(0, clamped), moving, ...rest.slice(clamped)];

  return next.map((status, itemIndex) => ({ ...status, position: itemIndex * 1000 }));
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
