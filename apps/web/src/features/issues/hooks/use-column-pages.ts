import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  encodeIssueColumnCursor,
  type IssueCardSummary,
  type ProjectStatusSummary,
  type UpdateIssueRequest,
} from "@teamos/shared";

import { notify } from "@/shared";
import { listIssueBoard, listIssueColumn, updateIssue } from "../api/issue-api";
import { readIssueError } from "../lib/issue-errors";
import { COLUMN_WINDOW, insertIssue, limitColumnWindow } from "../lib/issue-placement";
import type { BoardColumn } from "../lib/board-columns";
import { issueKeys } from "../query-keys";

interface InternalColumn extends BoardColumn {
  nextCursor: string | null;
  scope: string;
}

interface MoveIssueInput {
  index: number;
  issueId: string;
  request: UpdateIssueRequest;
  retain?: (issue: IssueCardSummary) => boolean;
  statusId: string;
}

interface UseColumnPagesOptions {
  enabled: boolean;
  organizationSlug: string;
  params: Record<string, string>;
  projectId: string | null;
  statuses: readonly ProjectStatusSummary[];
}

const COLUMN_PAGE = 40;

function paramsKey(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key] ?? ""}`)
    .join("&");
}

function sortCards(issues: readonly IssueCardSummary[]): IssueCardSummary[] {
  return [...issues].sort(
    (left, right) => left.position - right.position || left.id.localeCompare(right.id),
  );
}

function dedupe(issues: readonly IssueCardSummary[]): IssueCardSummary[] {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    if (seen.has(issue.id)) {
      return false;
    }

    seen.add(issue.id);

    return true;
  });
}

function fromBoard(
  statuses: readonly ProjectStatusSummary[],
  columns: readonly {
    hasMore: boolean;
    issues: IssueCardSummary[];
    nextCursor: string | null;
    scope: string;
    statusId: string;
    total: number;
  }[],
): InternalColumn[] {
  const pages = new Map(columns.map((column) => [column.statusId, column]));

  return [...statuses]
    .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
    .map((status) => {
      const page = pages.get(status.id);

      return {
        error: null,
        hasMoreAfter: page?.hasMore ?? false,
        hasMoreBefore: false,
        issues: page?.issues ?? [],
        loadingMore: false,
        nextCursor: page?.nextCursor ?? null,
        prependToken: 0,
        prepended: 0,
        scope: page?.scope ?? "",
        skippedBefore: 0,
        status,
        total: page?.total ?? 0,
        trimToken: 0,
        trimmed: 0,
      };
    });
}

function cursorFor(column: InternalColumn, issue: IssueCardSummary): string {
  return encodeIssueColumnCursor({
    id: issue.id,
    position: issue.position,
    scope: column.scope,
    statusId: column.status.id,
    v: 1,
  });
}

function useColumnPages(options: UseColumnPagesOptions) {
  const projectId = options.projectId;
  const key = paramsKey(options.params);
  const generation = useRef(0);
  const loadingIds = useRef(new Set<string>());
  const moving = useRef(false);
  const seenBoard = useRef(0);
  const columnsRef = useRef<InternalColumn[]>([]);
  const [columns, setColumns] = useState<InternalColumn[]>([]);
  columnsRef.current = columns;
  const board = useQuery({
    enabled: options.enabled && projectId !== null,
    queryFn: () => listIssueBoard(options.organizationSlug, projectId ?? "", options.params),
    queryKey:
      projectId === null
        ? ["issues", "board", "pending", key]
        : issueKeys(options.organizationSlug, projectId).board(options.params),
  });

  useEffect(() => {
    generation.current += 1;
    seenBoard.current = 0;
    setColumns([]);
  }, [key, projectId]);

  useEffect(() => {
    if (board.data === undefined || moving.current) {
      return;
    }

    if (board.dataUpdatedAt === seenBoard.current && columnsRef.current.length > 0) {
      setColumns((current) =>
        current.map((column) => {
          const status = options.statuses.find((item) => item.id === column.status.id);

          return status === undefined ? column : { ...column, status };
        }),
      );

      return;
    }

    seenBoard.current = board.dataUpdatedAt;
    setColumns(fromBoard(options.statuses, board.data.columns));
  }, [board.data, board.dataUpdatedAt, options.statuses]);

  async function load(statusId: string, direction: "after" | "before") {
    if (projectId === null) {
      return;
    }

    const flight = `${statusId}:${direction}`;
    const current = columnsRef.current.find((column) => column.status.id === statusId);

    if (current === undefined || current.loadingMore || loadingIds.current.has(flight)) {
      return;
    }

    const anchor =
      direction === "after" ? current.issues[current.issues.length - 1] : current.issues[0];

    if (anchor === undefined || current.scope.length === 0) {
      return;
    }

    if (direction === "after" && (!current.hasMoreAfter || current.nextCursor === null)) {
      return;
    }

    if (direction === "before" && !current.hasMoreBefore) {
      return;
    }

    const requestGeneration = generation.current;
    const cursor = direction === "after" ? current.nextCursor : cursorFor(current, anchor);

    if (cursor === null) {
      return;
    }

    loadingIds.current.add(flight);

    setColumns((items) =>
      items.map((column) =>
        column.status.id === statusId ? { ...column, error: null, loadingMore: true } : column,
      ),
    );

    try {
      const page = await listIssueColumn(options.organizationSlug, projectId, statusId, {
        ...options.params,
        ...(direction === "before" ? { before: "1" } : {}),
        cursor,
        limit: String(COLUMN_PAGE),
      });

      if (requestGeneration !== generation.current) {
        return;
      }

      setColumns((items) =>
        items.map((column) => {
          if (column.status.id !== statusId) {
            return column;
          }

          if (direction === "before") {
            const merged = dedupe([...page.issues, ...column.issues]);
            const added = Math.max(0, merged.length - column.issues.length);
            const overflow = Math.max(0, merged.length - COLUMN_WINDOW);
            const kept = overflow > 0 ? merged.slice(0, merged.length - overflow) : merged;
            const last = kept[kept.length - 1];

            return {
              ...column,
              error: null,
              hasMoreAfter: overflow > 0 || column.hasMoreAfter,
              hasMoreBefore: page.hasMore,
              issues: kept,
              loadingMore: false,
              nextCursor:
                overflow > 0 && last !== undefined ? cursorFor(column, last) : column.nextCursor,
              prependToken: added > 0 ? column.prependToken + 1 : column.prependToken,
              prepended: added,
              skippedBefore: page.hasMore ? Math.max(0, column.skippedBefore - added) : 0,
            };
          }

          const merged = dedupe([...column.issues, ...page.issues]);
          const limited = limitColumnWindow(merged, column.skippedBefore);

          return {
            ...column,
            error: null,
            hasMoreAfter: page.hasMore,
            hasMoreBefore: limited.skippedBefore > 0 || column.hasMoreBefore,
            issues: limited.issues,
            loadingMore: false,
            nextCursor: page.nextCursor,
            skippedBefore: limited.skippedBefore,
            trimToken: limited.trimmed > 0 ? column.trimToken + 1 : column.trimToken,
            trimmed: limited.trimmed,
          };
        }),
      );
    } catch (error) {
      if (requestGeneration !== generation.current) {
        return;
      }

      const message =
        readIssueError(error, "More issues could not be loaded.") ??
        "More issues could not be loaded.";

      setColumns((items) =>
        items.map((column) =>
          column.status.id === statusId
            ? { ...column, error: message, loadingMore: false }
            : column,
        ),
      );
    } finally {
      loadingIds.current.delete(flight);
    }
  }

  async function moveIssue(input: MoveIssueInput) {
    if (projectId === null || moving.current) {
      return;
    }

    const snapshot = columnsRef.current;
    const source = snapshot.find((column) =>
      column.issues.some((issue) => issue.id === input.issueId),
    );
    const movingCard = source?.issues.find((issue) => issue.id === input.issueId);
    const destination = snapshot.find((column) => column.status.id === input.statusId);

    if (source === undefined || movingCard === undefined || destination === undefined) {
      return;
    }

    const nextCard = { ...movingCard, statusId: input.statusId };
    const retained = input.retain?.(nextCard) ?? true;
    const sameColumn = source.status.id === destination.status.id;
    moving.current = true;
    setColumns((items) =>
      items.map((column) => {
        const isSource = column.status.id === source.status.id;
        const isDestination = column.status.id === destination.status.id;

        if (!isSource && !isDestination) {
          return column;
        }

        const without = column.issues.filter((issue) => issue.id !== input.issueId);

        if (!retained) {
          return isSource
            ? { ...column, issues: without, total: Math.max(0, column.total - 1) }
            : column;
        }

        if (!isDestination) {
          return { ...column, issues: without, total: Math.max(0, column.total - 1) };
        }

        if (input.request.placement === undefined && column.skippedBefore > 0 && !sameColumn) {
          return {
            ...column,
            issues: without,
            skippedBefore: column.skippedBefore + 1,
            total: column.total + 1,
          };
        }

        return {
          ...column,
          issues:
            input.request.placement === undefined
              ? insertIssue(column.issues, nextCard, 0)
              : insertIssue(column.issues, nextCard, input.index),
          total: sameColumn ? column.total : column.total + 1,
        };
      }),
    );

    try {
      const saved = await updateIssue(
        options.organizationSlug,
        projectId,
        input.issueId,
        input.request,
      );

      if (!retained) {
        return;
      }

      setColumns((items) =>
        items.map((column) => {
          const without = column.issues.filter((issue) => issue.id !== saved.id);

          if (column.status.id !== saved.statusId) {
            return without.length === column.issues.length
              ? column
              : { ...column, issues: without };
          }

          return { ...column, issues: sortCards(dedupe([...without, saved])) };
        }),
      );
    } catch (error) {
      setColumns(snapshot);
      notify.error(
        readIssueError(error, "The issue could not be moved.") ?? "The issue could not be moved.",
      );
      await board.refetch();
    } finally {
      moving.current = false;
    }
  }

  return {
    columns,
    dataUpdatedAt: board.dataUpdatedAt,
    hasLoadedIssue: (issueId: string) =>
      board.data?.columns.some((column) => column.issues.some((issue) => issue.id === issueId)) ??
      false,
    isError: board.isError,
    isFetching: board.isFetching,
    isPending: board.isPending,
    loadMore: (statusId: string) => {
      void load(statusId, "after");
    },
    loadPrevious: (statusId: string) => {
      void load(statusId, "before");
    },
    moveIssue,
    retry: () => {
      void board.refetch();
    },
  };
}

export { useColumnPages, type MoveIssueInput };
