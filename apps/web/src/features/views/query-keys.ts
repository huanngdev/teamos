function issueViewKeys(slug: string, projectId: string) {
  const prefix = ["organization", slug, "projects", projectId, "issue-views"] as const;

  return {
    detail: (viewId: string) => [...prefix, "detail", viewId] as const,
    list: (limit: number, offset: number, search = "") =>
      [...prefix, "list", limit, offset, search] as const,
    navigation: () => [...prefix, "navigation"] as const,
    prefix: () => prefix,
  };
}

export { issueViewKeys };
