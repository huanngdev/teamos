import {
  currentUserResponseSchema,
  socialProvidersResponseSchema,
  type CurrentUserResponse,
  type SocialProvider,
} from "@teamos/shared";

import {
  ApiClientError,
  apiClient,
  requestParsed,
  toApiClientError,
} from "@/shared/api/api-client";

/*
 * The browser reads its session from `/api/me` instead of Better Auth's
 * `/get-session`. The TeamOS response omits the session token, so the cookie
 * stays HttpOnly and cannot be read or replayed from JavaScript.
 */
async function getCurrentUser(): Promise<CurrentUserResponse> {
  return requestParsed(currentUserResponseSchema, { method: "get", url: "/api/me" });
}

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

export { getCurrentUser, getSocialProviders };
