import { Navigate, Outlet, useLocation } from "react-router";

import { PageError, PageLoading } from "@/shared";
import { ReadinessScreen } from "@/features/system";
import { useProtectedRoute } from "./use-protected-route";

function ProtectedLayout() {
  const state = useProtectedRoute();
  const location = useLocation();

  switch (state.status) {
    case "readiness":
      return <ReadinessScreen state={state.readiness} onRetry={state.readiness.retry} />;
    case "loading":
      return <PageLoading label="Checking your session" />;
    case "session-error":
      return (
        <PageError
          description="We could not check your session. This is usually temporary."
          onRetry={state.retry}
          title="Connection problem"
        />
      );
    case "unauthenticated": {
      /*
       * The requested URL is carried to login so a deep link is restored after
       * authentication instead of dropping the user on a generic workspace.
       */
      const next = `${location.pathname}${location.search}`;

      return <Navigate replace to={`/login?next=${encodeURIComponent(next)}`} />;
    }
    case "unverified":
      return <Navigate replace to="/auth/verify-email" />;
    case "ready":
      return <Outlet />;
  }
}

export { ProtectedLayout };
