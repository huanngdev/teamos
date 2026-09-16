import { apiErrorResponseSchema } from "@teamos/shared";

const requestIdHeaders = {
  "x-request-id": {
    description: "Correlation ID for the request.",
    schema: { minLength: 1, type: "string" as const },
  },
};

const rateLimitHeaders = {
  "retry-after": {
    description: "Seconds until another request may be attempted.",
    schema: { minLength: 1, type: "string" as const },
  },
  "x-ratelimit-limit": {
    description: "Maximum requests in the configured rate-limit window.",
    schema: { minLength: 1, type: "string" as const },
  },
  "x-ratelimit-remaining": {
    description: "Requests remaining in the configured rate-limit window.",
    schema: { minLength: 1, type: "string" as const },
  },
  "x-ratelimit-reset": {
    description: "Unix timestamp when the rate-limit window resets.",
    schema: { minLength: 1, type: "string" as const },
  },
};

const apiErrorResponses = {
  400: {
    content: { "application/json": { schema: apiErrorResponseSchema } },
    description: "The request is malformed.",
    headers: requestIdHeaders,
  },
  404: {
    content: { "application/json": { schema: apiErrorResponseSchema } },
    description: "The requested resource was not found.",
    headers: requestIdHeaders,
  },
  408: {
    content: { "application/json": { schema: apiErrorResponseSchema } },
    description: "The request timed out.",
    headers: requestIdHeaders,
  },
  413: {
    content: { "application/json": { schema: apiErrorResponseSchema } },
    description: "The request body is too large.",
    headers: requestIdHeaders,
  },
  415: {
    content: { "application/json": { schema: apiErrorResponseSchema } },
    description: "The request content type is not supported.",
    headers: requestIdHeaders,
  },
  422: {
    content: { "application/json": { schema: apiErrorResponseSchema } },
    description: "The request failed validation.",
    headers: requestIdHeaders,
  },
  429: {
    content: { "application/json": { schema: apiErrorResponseSchema } },
    description: "The request rate limit was exceeded.",
    headers: { ...rateLimitHeaders, ...requestIdHeaders },
  },
  500: {
    content: { "application/json": { schema: apiErrorResponseSchema } },
    description: "An unexpected server error occurred.",
    headers: requestIdHeaders,
  },
  503: {
    content: { "application/json": { schema: apiErrorResponseSchema } },
    description: "A required API dependency is unavailable.",
    headers: requestIdHeaders,
  },
} as const;

const protectedRouteErrorResponses = {
  401: {
    content: { "application/json": { schema: apiErrorResponseSchema } },
    description: "The request requires an authenticated session.",
    headers: requestIdHeaders,
  },
  403: {
    content: { "application/json": { schema: apiErrorResponseSchema } },
    description: "The authenticated user is not allowed to perform this action.",
    headers: requestIdHeaders,
  },
} as const;

export { apiErrorResponses, protectedRouteErrorResponses, requestIdHeaders };
