import type { OrganizationSummary } from "@teamos/shared";

type WorkspaceDestination =
  { kind: "recent"; slug: string } | { kind: "newest"; slug: string } | { kind: "create" };

function compareByNewest(left: OrganizationSummary, right: OrganizationSummary): number {
  const createdAtDifference = Date.parse(right.createdAt) - Date.parse(left.createdAt);

  if (createdAtDifference !== 0) {
    return createdAtDifference;
  }

  /* Timestamps can collide, so fall back to the id for a stable order. */
  return right.id.localeCompare(left.id);
}

/*
 * Single source of truth for which workspace should open. A remembered
 * workspace wins only while the user
 * is still a member of it; otherwise the newest workspace is used, and a user
 * with no workspaces is sent to creation. Better Auth does not guarantee a row
 * order, so "newest" is derived from `createdAt` instead of array position.
 */
function resolveWorkspaceDestination(
  organizations: readonly OrganizationSummary[],
  recentSlug: string | null,
): WorkspaceDestination {
  if (organizations.length === 0) {
    return { kind: "create" };
  }

  if (recentSlug !== null) {
    const recent = organizations.find((organization) => organization.slug === recentSlug);

    if (recent !== undefined) {
      return { kind: "recent", slug: recent.slug };
    }
  }

  const [newest] = [...organizations].sort(compareByNewest);

  /* Unreachable for a non-empty list, but keeps the return type total. */
  return newest === undefined ? { kind: "create" } : { kind: "newest", slug: newest.slug };
}

export { resolveWorkspaceDestination, type WorkspaceDestination };
