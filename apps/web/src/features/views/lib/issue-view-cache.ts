import type { IssueViewListResponse } from "@teamos/shared";
import type { QueryClient } from "@tanstack/react-query";

import { issueViewKeys } from "../query-keys";

interface InfiniteViewPages {
  pageParams: unknown[];
  pages: unknown[];
}

function isViewList(value: unknown): value is IssueViewListResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "pagination" in value &&
    "views" in value &&
    Array.isArray(value.views)
  );
}

function isInfiniteViewPages(value: unknown): value is InfiniteViewPages {
  return (
    typeof value === "object" &&
    value !== null &&
    "pageParams" in value &&
    "pages" in value &&
    Array.isArray(value.pages)
  );
}

function withoutIssueView(value: unknown, viewId: string): unknown {
  if (isInfiniteViewPages(value)) {
    return {
      ...value,
      pages: value.pages.map((page) => withoutIssueView(page, viewId)),
    };
  }

  if (!isViewList(value)) {
    return value;
  }

  const views = value.views.filter((view) => view.id !== viewId);

  return {
    ...value,
    pagination: {
      ...value.pagination,
      total: Math.max(0, value.pagination.total - (value.views.length - views.length)),
    },
    views,
  };
}

function removeCachedIssueView(
  queryClient: QueryClient,
  slug: string,
  projectId: string,
  viewId: string,
): void {
  queryClient.setQueriesData({ queryKey: issueViewKeys(slug, projectId).prefix() }, (existing) =>
    withoutIssueView(existing, viewId),
  );
  queryClient.removeQueries({
    queryKey: issueViewKeys(slug, projectId).detail(viewId),
  });
}

export { removeCachedIssueView, withoutIssueView };
