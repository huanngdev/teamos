import { z } from "zod";

const apiErrorCodeSchema = z.enum([
  "CONFLICT",
  "EMAIL_VERIFICATION_REQUIRED",
  "FORBIDDEN",
  "HTTP_ERROR",
  "INTERNAL_SERVER_ERROR",
  "INVALID_JSON",
  "NOT_FOUND",
  "ORGANIZATION_NOT_FOUND",
  "RATE_LIMIT_EXCEEDED",
  "RATE_LIMIT_UNAVAILABLE",
  "REQUEST_BODY_TOO_LARGE",
  "REQUEST_TIMEOUT",
  "UNAUTHENTICATED",
  "UNSUPPORTED_MEDIA_TYPE",
  "VALIDATION_ERROR",
]);

const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  details: z.array(z.unknown()).optional(),
  message: z.string().min(1),
  requestId: z.string().min(1),
});

const apiErrorResponseSchema = z.object({
  error: apiErrorSchema,
});

type ApiError = z.infer<typeof apiErrorSchema>;
type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export {
  apiErrorCodeSchema,
  apiErrorResponseSchema,
  apiErrorSchema,
  type ApiError,
  type ApiErrorCode,
  type ApiErrorResponse,
};
