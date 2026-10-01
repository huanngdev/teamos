import { z } from "zod";

import type { IssueListFilters } from "./issue-list-query.js";

const issueColumnCursorSchema = z.object({
  id: z.uuid(),
  position: z.number().int(),
  scope: z.string().min(1).max(4_000),
  statusId: z.uuid(),
  v: z.literal(1),
});

type IssueColumnCursor = z.infer<typeof issueColumnCursorSchema>;

function canonicalIssueColumnScope(statusId: string, filters: IssueListFilters): string {
  return [
    statusId,
    [...filters.assignees].sort().join(","),
    [...filters.categories].sort().join(","),
    filters.createdFrom ?? "",
    filters.createdTo ?? "",
    filters.description ?? "",
    filters.includeUnassigned ? "1" : "0",
    filters.numberMax ?? "",
    filters.numberMin ?? "",
    [...filters.priorities].sort().join(","),
    filters.q ?? "",
    [...filters.statusIds].sort().join(","),
    filters.timeZone,
    filters.title ?? "",
    filters.updatedFrom ?? "",
    filters.updatedTo ?? "",
    "position,id",
  ].join("\u001f");
}

/*
 * Shared code cannot depend on the DOM type library. Bun and the browser both
 * provide these globals; a missing one makes the cursor unreadable.
 */
function encodeBase64Url(value: string): string {
  const encode = (globalThis as { TextEncoder?: new () => { encode(input: string): Uint8Array } })
    .TextEncoder;
  const toBase64 = (globalThis as { btoa?: (input: string) => string }).btoa;

  if (encode === undefined || toBase64 === undefined) {
    throw new Error("Base64 encoding is unavailable.");
  }

  const bytes = new encode().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return toBase64(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string): string | undefined {
  const decode = (globalThis as { TextDecoder?: new () => { decode(input: Uint8Array): string } })
    .TextDecoder;
  const fromBase64 = (globalThis as { atob?: (input: string) => string }).atob;

  if (decode === undefined || fromBase64 === undefined) {
    return undefined;
  }

  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = fromBase64(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  const bytes = Uint8Array.from(binary, (character: string) => character.charCodeAt(0));

  return new decode().decode(bytes);
}

function encodeIssueColumnCursor(cursor: IssueColumnCursor): string {
  return encodeBase64Url(JSON.stringify(cursor));
}

function decodeIssueColumnCursor(value: string): IssueColumnCursor | undefined {
  if (value.length === 0 || value.length > 8_000) {
    return undefined;
  }

  try {
    const decoded = decodeBase64Url(value);

    if (decoded === undefined) {
      return undefined;
    }

    const parsed = issueColumnCursorSchema.safeParse(JSON.parse(decoded));

    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export {
  canonicalIssueColumnScope,
  decodeIssueColumnCursor,
  encodeIssueColumnCursor,
  type IssueColumnCursor,
};
