const ORGANIZATIONS_QUERY_KEY = ["organizations"] as const;

function workspaceKeys(slug: string) {
  return {
    detail: () => ["organization", slug] as const,
  };
}

export { ORGANIZATIONS_QUERY_KEY, workspaceKeys };
