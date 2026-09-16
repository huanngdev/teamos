import { readinessStatusSchema, type ReadinessStatus } from "@teamos/shared";

import { ApiClientError, apiClient, toApiClientError } from "./api-client";

class ReadinessUnavailableError extends Error {
  readonly readiness: ReadinessStatus;

  constructor(readiness: ReadinessStatus) {
    super("One or more backend services are unavailable.");
    this.name = "ReadinessUnavailableError";
    this.readiness = readiness;
  }
}

async function getReadiness(signal: AbortSignal): Promise<ReadinessStatus> {
  try {
    const response = await apiClient.get<unknown>("/health/ready", {
      signal,
      validateStatus: (status) => (status >= 200 && status < 300) || status === 503,
    });
    const parsed = readinessStatusSchema.safeParse(response.data);

    if (!parsed.success) {
      throw new ApiClientError("The API returned an invalid readiness response.", {
        kind: "invalid-response",
        status: response.status,
      });
    }

    if (response.status === 503 && parsed.data.status !== "error") {
      throw new ApiClientError("The API returned an invalid readiness response.", {
        kind: "invalid-response",
        status: response.status,
      });
    }

    if (parsed.data.status === "error") {
      throw new ReadinessUnavailableError(parsed.data);
    }

    return parsed.data;
  } catch (error: unknown) {
    if (error instanceof ReadinessUnavailableError || error instanceof ApiClientError) {
      throw error;
    }

    throw toApiClientError(error);
  }
}

export { getReadiness, ReadinessUnavailableError };
