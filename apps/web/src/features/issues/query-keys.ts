function issueKeys(slug: string, projectId: string) {
  const prefix = ["organization", slug, "projects", projectId, "issues"] as const;

  return {
    board: (params: Record<string, string>) => [...prefix, "board", params] as const,
    byNumber: (number: string) => [...prefix, "by-number", number] as const,
    cards: () => [...prefix, "cards"] as const,
    column: (statusId: string, params: Record<string, string>) =>
      [...prefix, "column", statusId, params] as const,
    detail: (issueId: string) => [...prefix, "detail", issueId] as const,
    list: (params: Record<string, string>) => [...prefix, "list", params] as const,
    prefix: () => prefix,
    statuses: () => [...prefix, "statuses"] as const,
  };
}

function columnDragId(statusId: string): string {
  return `column:${statusId}`;
}

function issueDragId(issueId: string): string {
  return `issue:${issueId}`;
}

function parseDragId(value: string): { id: string; kind: "column" | "issue" } | null {
  if (value.startsWith("column:")) {
    return { id: value.slice("column:".length), kind: "column" };
  }

  if (value.startsWith("issue:")) {
    return { id: value.slice("issue:".length), kind: "issue" };
  }

  return null;
}

export { columnDragId, issueDragId, issueKeys, parseDragId };
