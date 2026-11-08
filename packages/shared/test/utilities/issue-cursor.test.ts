import { describe, expect, test } from "bun:test";

import {
  canonicalIssueColumnScope,
  decodeIssueColumnCursor,
  encodeIssueColumnCursor,
} from "./issue-cursor.js";
import type { IssueListFilters } from "./issue-list-query.js";

const statusId = "11111111-1111-4111-8111-111111111111";
const issueId = "22222222-2222-4222-8222-222222222222";

function filters(overrides: Partial<IssueListFilters> = {}): IssueListFilters {
  return {
    assignees: [],
    categories: [],
    createdFrom: undefined,
    createdTo: undefined,
    content: undefined,
    includeCurrentUser: false,
    includeFacets: false,
    includeUnassigned: false,
    numberMax: undefined,
    numberMin: undefined,
    priorities: [],
    q: undefined,
    statusIds: [],
    timeZone: "UTC",
    title: undefined,
    unsatisfiable: false,
    updatedFrom: undefined,
    updatedTo: undefined,
    ...overrides,
  };
}

describe("issue column cursors", () => {
  test("round-trips a cursor and rejects a different column scope", () => {
    const scope = canonicalIssueColumnScope(statusId, filters({ q: "gate" }));
    const encoded = encodeIssueColumnCursor({
      id: issueId,
      position: 1_000,
      scope,
      statusId,
      v: 1,
    });
    const decoded = decodeIssueColumnCursor(encoded);

    expect(decoded).toEqual({ id: issueId, position: 1_000, scope, statusId, v: 1 });
    expect(canonicalIssueColumnScope(statusId, filters())).not.toBe(scope);
  });

  test("rejects a cursor that was not produced by the encoder", () => {
    expect(decodeIssueColumnCursor("not-a-cursor")).toBeUndefined();
    expect(decodeIssueColumnCursor("")).toBeUndefined();
  });
});
