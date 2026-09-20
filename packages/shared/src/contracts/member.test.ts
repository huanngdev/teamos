import { describe, expect, test } from "bun:test";

import { SEARCH_TERM_MAX_LENGTH } from "../utilities/search.js";
import {
  MEMBER_LIST_DEFAULT_LIMIT,
  MEMBER_LIST_MAX_LIMIT,
  memberListQuerySchema,
  memberListResponseSchema,
  updateMemberRoleSchema,
} from "./member.js";

describe("memberListQuerySchema", () => {
  test("applies bounded defaults", () => {
    const parsed = memberListQuerySchema.parse({});

    expect(parsed.limit).toBe(MEMBER_LIST_DEFAULT_LIMIT);
    expect(parsed.offset).toBe(0);
    expect(parsed.search).toBeUndefined();
  });

  test("trims the search term", () => {
    expect(memberListQuerySchema.parse({ search: "  ada  " }).search).toBe("ada");
  });

  test("rejects a search term beyond the length bound", () => {
    const search = "a".repeat(SEARCH_TERM_MAX_LENGTH + 1);

    expect(memberListQuerySchema.safeParse({ search }).success).toBe(false);
  });

  test("rejects an oversized or negative page window", () => {
    expect(memberListQuerySchema.safeParse({ limit: MEMBER_LIST_MAX_LIMIT + 1 }).success).toBe(
      false,
    );
    expect(memberListQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(memberListQuerySchema.safeParse({ offset: -1 }).success).toBe(false);
  });
});

describe("memberListResponseSchema", () => {
  test("accepts an empty page with pagination metadata", () => {
    const parsed = memberListResponseSchema.parse({
      members: [],
      pagination: { limit: 25, offset: 0, total: 0 },
    });

    expect(parsed.members).toEqual([]);
    expect(parsed.pagination.total).toBe(0);
  });

  test("rejects a member without a verified email shape", () => {
    const parsed = memberListResponseSchema.safeParse({
      members: [
        {
          email: "not-an-email",
          id: "member-1",
          image: null,
          name: "Ada",
          role: "member",
          userId: "user-1",
        },
      ],
      pagination: { limit: 25, offset: 0, total: 1 },
    });

    expect(parsed.success).toBe(false);
  });
});

describe("updateMemberRoleSchema", () => {
  test("only accepts admin and member", () => {
    expect(updateMemberRoleSchema.safeParse({ role: "admin" }).success).toBe(true);
    expect(updateMemberRoleSchema.safeParse({ role: "member" }).success).toBe(true);
    expect(updateMemberRoleSchema.safeParse({ role: "owner" }).success).toBe(false);
    expect(updateMemberRoleSchema.safeParse({}).success).toBe(false);
  });
});
