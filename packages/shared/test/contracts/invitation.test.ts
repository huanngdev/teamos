import { describe, expect, test } from "bun:test";

import {
  createInvitationRequestSchema,
  invitationListResponseSchema,
  organizationInvitationSchema,
} from "./invitation.js";

describe("createInvitationRequestSchema", () => {
  test("normalizes email casing and whitespace", () => {
    const parsed = createInvitationRequestSchema.parse({ email: "  ADA@Example.COM " });

    expect(parsed.email).toBe("ada@example.com");
  });

  test("defaults the role to member", () => {
    expect(createInvitationRequestSchema.parse({ email: "ada@example.com" }).role).toBe("member");
  });

  test("only accepts an assignable role", () => {
    expect(
      createInvitationRequestSchema.safeParse({ email: "ada@example.com", role: "admin" }).success,
    ).toBe(true);
    expect(
      createInvitationRequestSchema.safeParse({ email: "ada@example.com", role: "owner" }).success,
    ).toBe(false);
  });

  test("rejects an invalid or oversized email", () => {
    expect(createInvitationRequestSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(
      createInvitationRequestSchema.safeParse({ email: `${"a".repeat(250)}@example.com` }).success,
    ).toBe(false);
  });
});

describe("organizationInvitationSchema", () => {
  test("accepts a pending invitation with an ISO expiration", () => {
    const parsed = organizationInvitationSchema.parse({
      createdAt: "2026-01-01T00:00:00.000Z",
      email: "ada@example.com",
      expiresAt: "2026-01-03T00:00:00.000Z",
      id: "invitation-1",
      inviterId: "user-1",
      role: "member",
      status: "pending",
    });

    expect(parsed.status).toBe("pending");
  });

  test("rejects an unknown status", () => {
    const parsed = organizationInvitationSchema.safeParse({
      createdAt: "2026-01-01T00:00:00.000Z",
      email: "ada@example.com",
      expiresAt: "2026-01-03T00:00:00.000Z",
      id: "invitation-1",
      inviterId: "user-1",
      role: "member",
      status: "expired",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("invitationListResponseSchema", () => {
  test("accepts an empty list", () => {
    expect(invitationListResponseSchema.parse({ invitations: [] }).invitations).toEqual([]);
  });
});
