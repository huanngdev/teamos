import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError as useRouterRouteError,
} from "react-router";

type RouteErrorState =
  | { kind: "not-found" }
  | {
      kind: "error";
      description: string;
      retry: () => void;
      title: string;
    };

function useRouteError(): RouteErrorState {
  const error = useRouterRouteError();
  const navigate = useNavigate();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return { kind: "not-found" };
  }

  return {
    kind: "error",
    /* Never surface the thrown value: stack traces and messages stay internal. */
    description: "TeamOS could not open this screen. Reload the page to try again.",
    retry: () => {
      void navigate(0);
    },
    title: "Something went wrong",
  };
}

export { useRouteError, type RouteErrorState };
