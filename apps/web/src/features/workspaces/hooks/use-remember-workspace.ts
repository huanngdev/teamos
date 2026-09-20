import { useEffect } from "react";

import { writeRecentWorkspaceSlug } from "../lib/recent-workspace-storage";

/*
 * Remembers the workspace the user is currently viewing. The write only runs
 * once the workspace is known to be accessible, so a removed member never has a
 * stale slug persisted for them.
 */
function useRememberWorkspace(userId: string | undefined, slug: string | undefined): void {
  useEffect(() => {
    if (userId === undefined || slug === undefined) {
      return;
    }

    writeRecentWorkspaceSlug(userId, slug);
  }, [slug, userId]);
}

export { useRememberWorkspace };
