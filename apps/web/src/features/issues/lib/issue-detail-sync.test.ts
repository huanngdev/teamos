import { expect, test } from "vitest";

import { issueDetailSync } from "./issue-detail-sync";

const issueId = "issue-1";
const initial = "2026-01-02T00:00:00.000Z";
const saved = "2026-01-02T00:00:01.000Z";
const remote = "2026-01-02T00:00:02.000Z";

test("keeps the editor when the cache is still the revision just acknowledged", () => {
  expect(
    issueDetailSync({
      acknowledgedRevision: `${issueId}:${saved}`,
      baseUpdatedAt: saved,
      cacheUpdatedAt: initial,
      dirty: false,
      issueId,
    }),
  ).toBe("keep");
});

test("keeps a later draft when the cache has not caught the acknowledgement", () => {
  expect(
    issueDetailSync({
      acknowledgedRevision: `${issueId}:${saved}`,
      baseUpdatedAt: saved,
      cacheUpdatedAt: initial,
      dirty: true,
      issueId,
    }),
  ).toBe("keep");
});

test("keeps the editor when the refetched row is the acknowledgement", () => {
  expect(
    issueDetailSync({
      acknowledgedRevision: `${issueId}:${saved}`,
      baseUpdatedAt: saved,
      cacheUpdatedAt: saved,
      dirty: false,
      issueId,
    }),
  ).toBe("keep");
});

test("conflicts when a newer row arrives while the draft is dirty", () => {
  expect(
    issueDetailSync({
      acknowledgedRevision: `${issueId}:${initial}`,
      baseUpdatedAt: initial,
      cacheUpdatedAt: remote,
      dirty: true,
      issueId,
    }),
  ).toBe("conflict");
});

test("applies a newer row when the editor is clean", () => {
  expect(
    issueDetailSync({
      acknowledgedRevision: `${issueId}:${initial}`,
      baseUpdatedAt: initial,
      cacheUpdatedAt: remote,
      dirty: false,
      issueId,
    }),
  ).toBe("apply");
});

test("applies the first row for an issue", () => {
  expect(
    issueDetailSync({
      acknowledgedRevision: null,
      baseUpdatedAt: "",
      cacheUpdatedAt: initial,
      dirty: false,
      issueId,
    }),
  ).toBe("apply");
});
