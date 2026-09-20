/* Query keys owned by the projects feature. */
function projectKeys(slug: string) {
  return {
    list: (search = "") => ["organization", slug, "projects", search] as const,
    /* Prefix for invalidating every filtered project list at once. */
    listPrefix: () => ["organization", slug, "projects"] as const,
    members: (projectId: string) =>
      ["organization", slug, "projects", projectId, "members"] as const,
  };
}

export { projectKeys };
