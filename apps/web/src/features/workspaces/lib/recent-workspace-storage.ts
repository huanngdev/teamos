/*
 * The previously opened workspace is remembered per authenticated user so a
 * sign-out and sign-in on the same browser returns to the same place, while a
 * second account on the same browser never inherits it.
 */
const RECENT_WORKSPACE_KEY_PREFIX = "teamos.recent-workspace.";

function recentWorkspaceKey(userId: string): string {
  return `${RECENT_WORKSPACE_KEY_PREFIX}${userId}`;
}

function readRecentWorkspaceSlug(userId: string): string | null {
  try {
    return window.localStorage.getItem(recentWorkspaceKey(userId));
  } catch {
    /* Storage can be unavailable in private modes; the preference is optional. */
    return null;
  }
}

function writeRecentWorkspaceSlug(userId: string, slug: string): void {
  try {
    window.localStorage.setItem(recentWorkspaceKey(userId), slug);
  } catch {
    /* Ignore a storage failure; the URL still tracks the current workspace. */
  }
}

export { readRecentWorkspaceSlug, writeRecentWorkspaceSlug };
