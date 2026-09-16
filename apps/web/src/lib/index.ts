export { apiErrorResponseSchema } from "@teamos/shared";
export type { ApiErrorResponse } from "@teamos/shared";
export { apiClient, ApiClientError, toApiClientError } from "./api-client";
export { apiUrl } from "./env";
export { getReadiness, ReadinessUnavailableError } from "./health-api";
export { queryClient } from "./query-client";
