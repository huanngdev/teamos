/*
 * Member and invitation query keys. Membership changes also affect the
 * workspace member count, so member hooks may invalidate the workspaces
 * feature's `workspaceKeys(...).detail()` as well.
 */
function memberKeys(slug: string) {
  return {
    invitations: () => ["organization", slug, "invitations"] as const,
    list: (search: string, offset: number) =>
      ["organization", slug, "members", search, offset] as const,
    /* Prefix for invalidating every filtered member page at once. */
    listPrefix: () => ["organization", slug, "members"] as const,
  };
}

export { memberKeys };
