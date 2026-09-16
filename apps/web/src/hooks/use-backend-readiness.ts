import { useQuery } from "@tanstack/react-query";
import type { ReadinessStatus } from "@teamos/shared";

import { ApiClientError } from "@/lib/api-client";
import { getReadiness, ReadinessUnavailableError } from "@/lib/health-api";

const READINESS_QUERY_KEY = ["system", "readiness"] as const;
const MAX_READINESS_RETRIES = 3;

type BackendReadinessState =
  | { isRetrying: boolean; status: "loading" }
  | { readiness: ReadinessStatus; status: "ready" }
  | {
      errorMessage: string;
      isRetrying: boolean;
      readiness: ReadinessStatus | undefined;
      status: "error";
    };

function isRetryableReadinessError(error: unknown) {
  if (error instanceof ReadinessUnavailableError) {
    return true;
  }

  if (!(error instanceof ApiClientError)) {
    return false;
  }

  if (error.kind === "network" || error.kind === "timeout") {
    return true;
  }

  return error.kind === "http" && (error.status ?? 0) >= 500;
}

function getReadinessErrorMessage(error: unknown) {
  if (error instanceof ReadinessUnavailableError) {
    return "The API is reachable, but one or more required services are not ready.";
  }

  if (error instanceof ApiClientError) {
    switch (error.kind) {
      case "cancelled":
        return "The readiness check was cancelled.";
      case "http":
        return error.message;
      case "invalid-response":
        return "The API returned an invalid readiness response.";
      case "network":
        return "The backend could not be reached. Check that the API is running.";
      case "timeout":
        return "The backend took too long to respond.";
    }
  }

  return "An unexpected error prevented the readiness check from completing.";
}

function useBackendReadiness(): BackendReadinessState & { retry: () => void } {
  const query = useQuery({
    gcTime: 5 * 60 * 1000,
    queryFn: ({ signal }) => getReadiness(signal),
    queryKey: READINESS_QUERY_KEY,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) =>
      failureCount < MAX_READINESS_RETRIES && isRetryableReadinessError(error),
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    staleTime: 0,
  });

  const retry = () => {
    void query.refetch();
  };

  if (query.isPending) {
    return { isRetrying: query.isFetching, retry, status: "loading" };
  }

  if (query.isSuccess) {
    return { readiness: query.data, retry, status: "ready" };
  }

  return {
    errorMessage: getReadinessErrorMessage(query.error),
    isRetrying: query.isFetching,
    readiness: query.error instanceof ReadinessUnavailableError ? query.error.readiness : undefined,
    retry,
    status: "error",
  };
}

export { useBackendReadiness, type BackendReadinessState };
