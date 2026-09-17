import { useBackendReadiness, type BackendReadinessState } from "@/features/system";
import { useAuthSession } from "@/features/auth";

type ReadinessRouteState = Extract<BackendReadinessState, { status: "error" | "loading" }> & {
  retry: () => void;
};

type ProtectedRouteState =
  | { readiness: ReadinessRouteState; status: "readiness" }
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "unverified" }
  | { status: "ready" };

function useProtectedRoute(): ProtectedRouteState {
  const readiness = useBackendReadiness();
  const session = useAuthSession();

  if (readiness.status !== "ready") {
    return { readiness, status: "readiness" };
  }

  if (session.status === "loading") {
    return { status: "loading" };
  }

  if (session.status === "unauthenticated") {
    return { status: "unauthenticated" };
  }

  if (!session.user.emailVerified) {
    return { status: "unverified" };
  }

  return { status: "ready" };
}

export { useProtectedRoute, type ProtectedRouteState };
