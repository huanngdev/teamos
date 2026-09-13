import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiErrorCode } from "@teamos/shared";

class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly details: readonly unknown[] | undefined;
  readonly status: ContentfulStatusCode;

  constructor(
    status: ContentfulStatusCode,
    code: ApiErrorCode,
    message: string,
    details?: readonly unknown[],
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export { AppError };
