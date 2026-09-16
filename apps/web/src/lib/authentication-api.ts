import { socialProvidersResponseSchema, type SocialProvider } from "@teamos/shared";

import { ApiClientError, apiClient, toApiClientError } from "./api-client";

async function getSocialProviders(): Promise<SocialProvider[]> {
  try {
    const response = await apiClient.get<unknown>("/api/authentication/providers");
    const parsed = socialProvidersResponseSchema.safeParse(response.data);

    if (!parsed.success) {
      throw new ApiClientError("The API returned an invalid provider response.", {
        kind: "invalid-response",
        status: response.status,
      });
    }

    return parsed.data.providers;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw toApiClientError(error);
  }
}

export { getSocialProviders };
