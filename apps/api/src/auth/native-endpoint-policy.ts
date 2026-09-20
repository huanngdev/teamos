import { APIError, createAuthMiddleware } from "better-auth/api";

import { assignableOrganizationRoleSchema } from "@teamos/shared";

const INVITE_MEMBER_PATH = "/organization/invite-member";
const UPDATE_MEMBER_ROLE_PATH = "/organization/update-member-role";

const MANAGED_ORGANIZATION_PATHS = new Set([
  "/organization/cancel-invitation",
  /*
   * Organization update, deletion, and leaving stay behind the TeamOS facade so
   * they cannot skip auditing, lifecycle cleanup, management rate limiting, and
   * future confirmation or ownership-transfer rules. Only `create` remains
   * reachable because the workspace creation flow still uses it directly.
   */
  "/organization/delete",
  "/organization/get-full-organization",
  "/organization/invite-member",
  "/organization/leave",
  "/organization/list-invitations",
  "/organization/list-members",
  "/organization/remove-member",
  "/organization/update",
  "/organization/update-member-role",
]);

function readRole(body: unknown): unknown {
  if (typeof body !== "object" || body === null || !("role" in body)) {
    return undefined;
  }

  return body.role;
}

function isOwnerRole(role: unknown): boolean {
  if (Array.isArray(role)) {
    return role.includes("owner");
  }

  return role === "owner";
}

/*
 * Ownership changes are intentionally out of scope for generic member
 * management. Better Auth would otherwise let an owner invite or promote
 * another owner through the same endpoints the UI uses.
 */
function assertAssignableRole(role: unknown): void {
  if (isOwnerRole(role)) {
    throw new APIError("BAD_REQUEST", {
      message: "The owner role can only be changed through an ownership transfer.",
    });
  }

  if (typeof role !== "string" || !assignableOrganizationRoleSchema.safeParse(role).success) {
    throw new APIError("BAD_REQUEST", { message: "Unsupported organization role." });
  }
}

/*
 * `resend: true` reuses the existing invitation id and skips creation hooks, so
 * a previously shared link would keep working. TeamOS rotates the invitation
 * instead, which invalidates the old link.
 */
function assertNoResend(body: unknown): void {
  if (typeof body === "object" && body !== null && "resend" in body && body.resend === true) {
    throw new APIError("BAD_REQUEST", {
      message: "Resending an invitation is not supported. Cancel it and invite again.",
    });
  }
}

const organizationLifecycleHooks = {
  before: createAuthMiddleware(async (context) => {
    if (context.path === INVITE_MEMBER_PATH) {
      assertNoResend(context.body);
      assertAssignableRole(readRole(context.body));

      return;
    }

    if (context.path === UPDATE_MEMBER_ROLE_PATH) {
      assertAssignableRole(readRole(context.body));
    }
  }),
};

/*
 * These endpoints are replaced by TeamOS routes that add authorization,
 * auditing, rate limiting, and stable contracts. The TeamOS routes call the
 * Better Auth server API directly, which does not pass through this list.
 */
function normalizeAuthPath(pathname: string): string {
  let normalized = pathname;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let decoded: string;

    try {
      decoded = decodeURIComponent(normalized);
    } catch {
      break;
    }

    if (decoded === normalized) {
      break;
    }

    normalized = decoded;
  }

  return normalized
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function isManagedOrganizationPath(pathname: string): boolean {
  const normalized = normalizeAuthPath(pathname);

  if (!normalized.startsWith("/api/auth/")) {
    return false;
  }

  return MANAGED_ORGANIZATION_PATHS.has(normalized.slice("/api/auth".length));
}

export {
  isManagedOrganizationPath,
  MANAGED_ORGANIZATION_PATHS,
  normalizeAuthPath,
  organizationLifecycleHooks,
};
