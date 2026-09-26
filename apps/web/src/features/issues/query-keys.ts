function issueKeys(slug: string, projectId: string) {
  const prefix = ["organization", slug, "projects", projectId, "issues"] as const;

  return {
    cards: () => [...prefix, "cards"] as const,
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
