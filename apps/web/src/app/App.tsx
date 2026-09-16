import { ReadinessScreen } from "@/components/readiness-screen";
import { useBackendReadiness } from "@/hooks/use-backend-readiness";

import { AppRoutes } from "./routes";

export function App() {
  const readiness = useBackendReadiness();

  if (readiness.status !== "ready") {
    return <ReadinessScreen state={readiness} onRetry={readiness.retry} />;
  }

  return <AppRoutes />;
}
