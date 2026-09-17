/*
 * Query keys owned by the workspaces feature. The `organization` namespace is
 * shared with the members and projects features, so slugs stay stable across
 * features and prefix invalidation keeps working.
 */
const ORGANIZATIONS_QUERY_KEY = ["organizations"] as const;

function workspaceKeys(slug: string) {
  return {
    detail: () => ["organization", slug] as const,
  };
}

export { ORGANIZATIONS_QUERY_KEY, workspaceKeys };
