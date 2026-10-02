import type { AuthenticatedSession, AuthenticatedUser } from "@teamos/shared";
import { useQuery } from "@tanstack/react-query";

import { ApiClientError, useShellStore } from "@/shared";
import { getCurrentUser } from "../api/authentication-api";
import { CURRENT_USER_QUERY_KEY } from "../query-keys";

type AuthSessionState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { retry: () => void; status: "error" }
  | { session: AuthenticatedSession; status: "authenticated"; user: AuthenticatedUser };

/*
 * The session is resolved through the sanitized TeamOS endpoint, so the raw
 * Better Auth session token never reaches the browser. A missing session is a
 * 401; any other failure is reported as a retryable error rather than a logout.
 */
function useAuthSession(): AuthSessionState {
  const cached = useShellStore((state) => state.session);
  const setSession = useShellStore((state) => state.setSession);
  const clear = useShellStore((state) => state.clear);
  const query = useQuery({
    enabled: cached === null,
    queryFn: async () => {
      const current = await getCurrentUser();
      setSession(current);

      return current;
    },
    queryKey: CURRENT_USER_QUERY_KEY,
    retry: false,
  });

  if (cached !== null) {
    return { session: cached.session, status: "authenticated", user: cached.user };
  }

  if (query.isPending) {
    return { status: "loading" };
  }

  if (query.isSuccess) {
    return { session: query.data.session, status: "authenticated", user: query.data.user };
  }

  if (query.error instanceof ApiClientError && query.error.status === 401) {
    clear();

    return { status: "unauthenticated" };
  }

  return {
    retry: () => {
      void query.refetch();
    },
    status: "error",
  };
}

export { useAuthSession, type AuthSessionState };
