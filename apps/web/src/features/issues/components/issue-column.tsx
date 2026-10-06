/* eslint-disable shadcn/no-arbitrary-values -- the issue viewport fills the column below its fixed 3rem header */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  DotsSixVerticalIcon,
  DotsThreeIcon,
  PlusIcon,
  TextTIcon,
  TrashIcon,
} from "@phosphor-icons/react";

import { KanbanColumn, KanbanColumnContent, KanbanColumnHandle } from "@/components/reui/kanban";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BoardColumn } from "../lib/board-columns";
import { IssueCard } from "./issue-card";
import { IssueStatusIndicator } from "./issue-status-indicator";

interface IssueColumnProps {
  canCreateIssue: boolean;
  canDragCards: boolean;
  canReorderColumns: boolean;
  canUpdateProject: boolean;
  column: BoardColumn;
  highlightedIssueId?: string | null;
  onCreateIssue: () => void;
  onDelete: () => void;
  onEditIssue: (issueId: string) => void;
  onLoadMore: () => void;
  onLoadPrevious: () => void;
  onRename: () => void;
}

const CARD_HEIGHT = 88;

interface BoardSpacerStyle extends CSSProperties {
  "--board-spacer"?: string;
}
const CARD_OVERSCAN = 4;

function IssueColumn({
  canCreateIssue,
  canDragCards,
  canReorderColumns,
  canUpdateProject,
  column,
  highlightedIssueId = null,
  onCreateIssue,
  onDelete,
  onEditIssue,
  onLoadMore,
  onLoadPrevious,
  onRename,
}: IssueColumnProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const armedAfter = useRef(true);
  const armedBefore = useRef(true);
  const [range, setRange] = useState({ end: 12, start: 0 });
  const visibleIssues = column.issues.slice(range.start, range.end);

  useEffect(() => {
    if (highlightedIssueId === null) {
      return;
    }

    const index = column.issues.findIndex((issue) => issue.id === highlightedIssueId);

    if (index < 0) {
      return;
    }

    const viewport = rootRef.current?.querySelector("[data-slot='scroll-area-viewport']");

    if (!(viewport instanceof HTMLElement)) {
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const card = viewport.querySelector(`[data-issue-id="${CSS.escape(highlightedIssueId)}"]`);

    if (card instanceof HTMLElement && typeof card.scrollIntoView === "function") {
      card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
      return;
    }

    if (typeof viewport.scrollTo === "function") {
      viewport.scrollTo({ behavior: "auto", top: index * CARD_HEIGHT });
    }
  }, [column.issues, highlightedIssueId]);

  useEffect(() => {
    const viewport = rootRef.current?.querySelector("[data-slot='scroll-area-viewport']");

    if (!(viewport instanceof HTMLElement)) {
      return;
    }

    const update = () => {
      const height = viewport.clientHeight === 0 ? 640 : viewport.clientHeight;
      const start = Math.max(0, Math.floor(viewport.scrollTop / CARD_HEIGHT) - CARD_OVERSCAN);
      const end = Math.min(
        column.issues.length,
        Math.ceil((viewport.scrollTop + height) / CARD_HEIGHT) + CARD_OVERSCAN,
      );

      setRange((current) =>
        current.start === start && current.end === end ? current : { end, start },
      );

      const distanceFromEnd = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;

      if (distanceFromEnd > 160) {
        armedAfter.current = true;
      }

      if (viewport.scrollTop > 160) {
        armedBefore.current = true;
      }
    };

    update();
    viewport.addEventListener("scroll", update, { passive: true });

    return () => {
      viewport.removeEventListener("scroll", update);
    };
  }, [column.issues.length]);

  useEffect(() => {
    const viewport = rootRef.current?.querySelector("[data-slot='scroll-area-viewport']");

    if (viewport instanceof HTMLElement && column.trimmed > 0) {
      viewport.scrollTop += column.trimmed * CARD_HEIGHT;
    }
  }, [column.trimToken, column.trimmed]);

  useEffect(() => {
    const viewport = rootRef.current?.querySelector("[data-slot='scroll-area-viewport']");

    if (viewport instanceof HTMLElement && column.prepended > 0) {
      viewport.scrollTop += column.prepended * CARD_HEIGHT;
    }
  }, [column.prependToken, column.prepended]);

  useEffect(() => {
    const viewport = rootRef.current?.querySelector("[data-slot='scroll-area-viewport']");
    const bottom = bottomRef.current;
    const top = topRef.current;

    if (!(viewport instanceof HTMLElement) || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === bottom) {
            if (!entry.isIntersecting) {
              armedAfter.current = true;
              continue;
            }

            if (armedAfter.current && column.hasMoreAfter && !column.loadingMore) {
              armedAfter.current = false;
              onLoadMore();
            }
          }

          if (entry.target === top) {
            if (!entry.isIntersecting) {
              armedBefore.current = true;
              continue;
            }

            if (armedBefore.current && column.hasMoreBefore && !column.loadingMore) {
              armedBefore.current = false;
              onLoadPrevious();
            }
          }
        }
      },
      { root: viewport, rootMargin: "160px" },
    );

    if (bottom !== null) {
      observer.observe(bottom);
    }

    if (top !== null) {
      observer.observe(top);
    }

    return () => {
      observer.disconnect();
    };
  }, [column.hasMoreAfter, column.hasMoreBefore, column.loadingMore, onLoadMore, onLoadPrevious]);

  return (
    <KanbanColumn
      className={canUpdateProject ? "h-full w-72 shrink-0" : "h-full w-72 shrink-0 !opacity-100"}
      disabled={!canUpdateProject}
      value={column.status.id}
    >
      <div className="relative flex h-full flex-col rounded-lg border bg-background" ref={rootRef}>
        <div className="flex h-12 shrink-0 items-center gap-2 px-3 py-2">
          {canReorderColumns ? (
            <KanbanColumnHandle
              // eslint-disable-next-line shadcn/no-restyle -- the reui handle hides itself until hover; keep it visible for keyboard and touch users
              className="opacity-100"
              render={(props) => (
                <Button
                  {...props}
                  aria-label={`Reorder ${column.status.name}`}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <DotsSixVerticalIcon />
                </Button>
              )}
            />
          ) : null}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <IssueStatusIndicator category={column.status.category} name={column.status.name} />
            <span className="shrink-0 text-xs text-muted-foreground">{column.total}</span>
          </div>
          <div className="flex items-center">
            {canCreateIssue ? (
              <Button
                aria-label={`Add issue to ${column.status.name}`}
                onClick={onCreateIssue}
                size="icon"
                type="button"
                variant="ghost"
              >
                <PlusIcon />
              </Button>
            ) : null}
            {canUpdateProject ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      aria-label={`${column.status.name} actions`}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <DotsThreeIcon />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={onRename}>
                      <TextTIcon data-icon="inline-start" />
                      Rename
                    </DropdownMenuItem>
                    {column.status.isDefault ? null : (
                      <DropdownMenuItem onClick={onDelete} variant="destructive">
                        <TrashIcon data-icon="inline-start" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        <ScrollArea className="h-[calc(100%-3rem)] w-full" fade="y">
          <KanbanColumnContent className="flex flex-col gap-2 px-3 pb-3" value={column.status.id}>
            {column.hasMoreBefore ? <div className="h-px" ref={topRef} /> : null}
            {column.issues.length === 0 && column.error === null ? (
              <p className="text-sm text-muted-foreground">
                {column.total === 0 ? "No issues" : "Loading issues"}
              </p>
            ) : (
              <>
                {range.start > 0 ? <ColumnSpacer rows={range.start} /> : null}
                {visibleIssues.map((issue) => (
                  <IssueCard
                    canDrag={canDragCards}
                    highlighted={issue.id === highlightedIssueId}
                    issue={issue}
                    key={issue.id}
                    onEdit={() => {
                      onEditIssue(issue.id);
                    }}
                  />
                ))}
                {range.end < column.issues.length ? (
                  <ColumnSpacer rows={column.issues.length - range.end} />
                ) : null}
              </>
            )}
            {column.error === null ? null : (
              <p className="text-sm text-destructive">{column.error}</p>
            )}
            {column.hasMoreAfter ? (
              <Button
                disabled={column.loadingMore}
                onClick={onLoadMore}
                type="button"
                variant="ghost"
              >
                {column.loadingMore ? "Loading" : "Load more"}
              </Button>
            ) : null}
            {column.hasMoreBefore ? (
              <Button
                disabled={column.loadingMore}
                onClick={onLoadPrevious}
                type="button"
                variant="ghost"
              >
                Load earlier
              </Button>
            ) : null}
            <div className="h-px" ref={bottomRef} />
          </KanbanColumnContent>
        </ScrollArea>
      </div>
    </KanbanColumn>
  );
}

function ColumnSpacer({ rows }: { rows: number }) {
  const style: BoardSpacerStyle = { "--board-spacer": `${rows * CARD_HEIGHT}px` };

  return <div aria-hidden="true" className="h-(--board-spacer)" style={style} />;
}

export { IssueColumn };
