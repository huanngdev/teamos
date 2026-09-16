import { Navigate, Outlet } from "react-router";

import { PageLoading } from "@/components/page-loading";
import { ReadinessScreen } from "@/components/readiness-screen";
import { useProtectedRoute } from "@/hooks/use-protected-route";

function ProtectedLayout() {
  const state = useProtectedRoute();

  switch (state.status) {
    case "readiness":
      return <ReadinessScreen state={state.readiness} onRetry={state.readiness.retry} />;
    case "loading":
      return <PageLoading label="Checking your session" />;
    case "unauthenticated":
      return <Navigate replace to="/login" />;
    case "unverified":
      return <Navigate replace to="/auth/verify-email" />;
    case "ready":
      return <Outlet />;
  }
}

export { ProtectedLayout };
