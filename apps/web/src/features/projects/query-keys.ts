function projectKeys(slug: string) {
  return {
    assignees: (projectId: string, search = "") =>
      ["organization", slug, "assignees", projectId, search] as const,
    assigneesPrefix: (projectId?: string) =>
      projectId === undefined
        ? (["organization", slug, "assignees"] as const)
        : (["organization", slug, "assignees", projectId] as const),
    list: (search = "") => ["organization", slug, "projects", search] as const,
    /* Prefix for invalidating every filtered project list at once. */
    listPrefix: () => ["organization", slug, "projects"] as const,
    members: (projectId: string) =>
      ["organization", slug, "projects", projectId, "members"] as const,
  };
}

export { projectKeys };
