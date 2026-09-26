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
