import { ISSUE_VIEW_LIST_DEFAULT_LIMIT, type IssueViewSummary } from "@teamos/shared";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useProjectList } from "@/features/projects";
import { getIssueView, listIssueViews } from "../api/issue-view-api";
import { projectViewPath } from "../lib/issue-view-paths";
import { issueViewKeys } from "../query-keys";

interface IssueViewNavigationItem {
  id: string;
  name: string;
  path: string;
}

interface IssueViewNavigation {
  activeViewId: string | null;
  expanded: boolean;
  hasMore: boolean;
  items: IssueViewNavigationItem[];
  loadingMore: boolean;
  onExpandedChange: (open: boolean) => void;
  onLoadMore: () => void;
  viewName: string | null;
}

function uniqueViews(views: readonly IssueViewSummary[]): IssueViewSummary[] {
  const seen = new Set<string>();

  return views.filter((view) => {
    if (seen.has(view.id)) {
      return false;
    }

    seen.add(view.id);
    return true;
  });
}

function useIssueViewNavigation(options: {
  activeViewId: string;
  enabled: boolean;
  organizationSlug: string;
  projectSlug: string;
}): IssueViewNavigation {
  const projectList = useProjectList({
    enabled: options.enabled,
    organizationSlug: options.organizationSlug,
  });
  const project = projectList.projects.find((item) => item.slug === options.projectSlug) ?? null;
  const projectId = project?.id ?? null;
  const scope = `${options.organizationSlug}/${options.projectSlug}`;
  const [expanded, setExpanded] = useState(options.activeViewId.length > 0);
  const [scopeKey, setScopeKey] = useState(scope);
  const seenViewId = useRef(options.activeViewId);

  if (scopeKey !== scope) {
    setScopeKey(scope);
    setExpanded(options.activeViewId.length > 0);
  }

  useEffect(() => {
    if (options.activeViewId.length > 0 && options.activeViewId !== seenViewId.current) {
      setExpanded(true);
    }

    seenViewId.current = options.activeViewId;
  }, [options.activeViewId]);

  const pages = useInfiniteQuery({
    enabled: options.enabled && projectId !== null,
    queryFn: ({ pageParam }) =>
      listIssueViews(options.organizationSlug, projectId ?? "", {
        limit: ISSUE_VIEW_LIST_DEFAULT_LIMIT,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.views.length, 0);

      return loaded < lastPage.pagination.total ? loaded : undefined;
    },
    queryKey:
      projectId === null
        ? ["issue-views", "navigation", "pending"]
        : issueViewKeys(options.organizationSlug, projectId).navigation(),
  });
  const current = useQuery({
    enabled: options.enabled && projectId !== null && options.activeViewId.length > 0,
    queryFn: () => getIssueView(options.organizationSlug, projectId ?? "", options.activeViewId),
    queryKey:
      projectId === null
        ? ["issue-views", "navigation", options.activeViewId]
        : issueViewKeys(options.organizationSlug, projectId).detail(options.activeViewId),
  });
  const loaded = pages.data?.pages.flatMap((page) => page.views) ?? [];
  const views = uniqueViews(current.data === undefined ? loaded : [...loaded, current.data]);

  return {
    activeViewId: options.activeViewId.length === 0 ? null : options.activeViewId,
    expanded,
    hasMore: pages.hasNextPage,
    items: views.map((view) => ({
      id: view.id,
      name: view.name,
      path: projectViewPath(options.organizationSlug, options.projectSlug, view.id),
    })),
    loadingMore: pages.isFetchingNextPage,
    onExpandedChange: setExpanded,
    onLoadMore: () => {
      if (pages.hasNextPage && !pages.isFetchingNextPage) {
        void pages.fetchNextPage();
      }
    },
    viewName: current.data?.name ?? null,
  };
}

export { useIssueViewNavigation, type IssueViewNavigation, type IssueViewNavigationItem };
