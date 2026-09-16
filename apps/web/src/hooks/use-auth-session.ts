import type { AuthSession, AuthUser } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";

type AuthSessionState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { session: AuthSession; status: "authenticated"; user: AuthUser };

function useAuthSession(): AuthSessionState {
  const { data, error, isPending } = authClient.useSession();

  if (isPending) {
    return { status: "loading" };
  }

  if (error !== null || data === null) {
    return { status: "unauthenticated" };
  }

  return { session: data.session, status: "authenticated", user: data.user };
}

export { useAuthSession, type AuthSessionState };
