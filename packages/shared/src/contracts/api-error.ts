import { z } from "zod";

const apiErrorCodeSchema = z.enum([
  "CONFLICT",
  "EMAIL_VERIFICATION_REQUIRED",
  "FORBIDDEN",
  "HTTP_ERROR",
  "INTERNAL_SERVER_ERROR",
  "INVALID_JSON",
  "INVITATION_ALREADY_PENDING",
  "INVITATION_EMAIL_FAILED",
  "INVITATION_LIMIT_REACHED",
  "INVITATION_NOT_FOUND",
  "ISSUE_NOT_FOUND",
  "MEMBER_ALREADY_IN_ORGANIZATION",
  "MEMBER_LIMIT_REACHED",
  "MEMBER_NOT_FOUND",
  "NOT_FOUND",
  "ORGANIZATION_NOT_FOUND",
  "PROJECT_NOT_FOUND",
  "PROJECT_SLUG_ALREADY_TAKEN",
  "PROJECT_STATUS_NAME_TAKEN",
  "PROJECT_STATUS_NOT_FOUND",
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
