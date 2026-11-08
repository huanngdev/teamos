import { NotFoundRoute } from "@/routes/not-found-route";
import { useRouteError } from "./use-route-error";

import { PageError } from "@/shared/components/page-error";

function RouteError() {
  const state = useRouteError();

  if (state.kind === "not-found") {
    return <NotFoundRoute />;
  }

  return <PageError description={state.description} onRetry={state.retry} title={state.title} />;
}

export { RouteError };
