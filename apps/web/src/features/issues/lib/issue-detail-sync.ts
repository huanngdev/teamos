type IssueDetailSync = "apply" | "conflict" | "keep";

interface IssueDetailSyncInput {
  acknowledgedRevision: string | null;
  baseUpdatedAt: string;
  cacheUpdatedAt: string;
  dirty: boolean;
  issueId: string;
}

function revisionTime(value: string): number {
  return Date.parse(value);
}

/*
 * A save moves the acknowledged revision forward before the detail query
 * refetches. That older cache row is not someone else's edit. Applying it
 * remounts the editor and pulls the caret back, including a blank line that
 * was just created. A newer cache row while the draft is dirty is a conflict
 * and must leave the editor mounted. The acknowledgement ref moves before the
 * base revision state renders, so a cache row equal to the draft's own base is
 * also kept rather than reported as someone else's edit.
 */
function issueDetailSync(input: IssueDetailSyncInput): IssueDetailSync {
  const cacheKey = `${input.issueId}:${input.cacheUpdatedAt}`;

  if (input.acknowledgedRevision === cacheKey) {
    return "keep";
  }

  const acknowledgedTime = revisionTime(input.baseUpdatedAt);
  const cacheTime = revisionTime(input.cacheUpdatedAt);
  const cacheIsBehindAcknowledgement =
    input.acknowledgedRevision === `${input.issueId}:${input.baseUpdatedAt}` &&
    input.baseUpdatedAt.length > 0 &&
    input.cacheUpdatedAt !== input.baseUpdatedAt &&
    (Number.isNaN(cacheTime) || Number.isNaN(acknowledgedTime) || cacheTime <= acknowledgedTime);

  if (cacheIsBehindAcknowledgement) {
    return "keep";
  }

  if (input.dirty && input.acknowledgedRevision !== null) {
    return input.cacheUpdatedAt === input.baseUpdatedAt ? "keep" : "conflict";
  }

  return "apply";
}

export { issueDetailSync, type IssueDetailSync, type IssueDetailSyncInput };
