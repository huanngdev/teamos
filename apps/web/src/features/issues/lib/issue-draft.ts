import {
  issueContentDocumentSchema,
  issuePrioritySchema,
  type IssueContentDocument,
  type IssuePriority,
} from "@teamos/shared";

interface IssuePageDraft {
  assigneeMemberIds: string[];
  baseUpdatedAt: string;
  content: IssueContentDocument | null;
  priority: IssuePriority;
  statusId: string;
  title: string;
}

function draftKey(issueId: string): string {
  return `teamos:issue-draft:${issueId}`;
}

function readAssigneeIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (!value.every((id) => typeof id === "string" && id.length > 0)) {
    return null;
  }

  return [...new Set(value)];
}

function readLegacyAssigneeId(value: unknown): string[] | null {
  if (value === null) {
    return [];
  }

  if (typeof value === "string" && value.length > 0) {
    return [value];
  }

  return null;
}

function readIssueDraft(issueId: string): IssuePageDraft | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(draftKey(issueId));

  if (raw === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      assigneeMemberId?: unknown;
      assigneeMemberIds?: unknown;
      baseUpdatedAt?: unknown;
      content?: unknown;
      priority?: unknown;
      statusId?: unknown;
      title?: unknown;
    };
    const priority = issuePrioritySchema.safeParse(parsed.priority);
    const content =
      parsed.content === null
        ? { data: null, success: true as const }
        : issueContentDocumentSchema.safeParse(parsed.content);
    const assigneeMemberIds =
      readAssigneeIds(parsed.assigneeMemberIds) ?? readLegacyAssigneeId(parsed.assigneeMemberId);

    if (
      !priority.success ||
      !content.success ||
      assigneeMemberIds === null ||
      typeof parsed.baseUpdatedAt !== "string" ||
      typeof parsed.statusId !== "string" ||
      typeof parsed.title !== "string"
    ) {
      return null;
    }

    return {
      assigneeMemberIds,
      baseUpdatedAt: parsed.baseUpdatedAt,
      content: content.data,
      priority: priority.data,
      statusId: parsed.statusId,
      title: parsed.title,
    };
  } catch {
    return null;
  }
}

function writeIssueDraft(issueId: string, draft: IssuePageDraft): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.setItem(draftKey(issueId), JSON.stringify(draft));
}

function clearIssueDraft(issueId: string): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.removeItem(draftKey(issueId));
}

export { clearIssueDraft, readIssueDraft, writeIssueDraft, type IssuePageDraft };
