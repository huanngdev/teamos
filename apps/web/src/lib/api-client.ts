import axios, { type AxiosInstance } from "axios";
import { apiErrorResponseSchema, type ApiErrorCode } from "@teamos/shared";

import { apiUrl } from "./env";

const normalizedApiUrl = apiUrl.replace(/\/+$/, "") || apiUrl;

const apiClient: AxiosInstance = axios.create({
  baseURL: normalizedApiUrl,
  headers: {
    Accept: "application/json",
  },
  timeout: 10_000,
  withCredentials: true,
});

type ApiClientErrorKind = "cancelled" | "http" | "invalid-response" | "network" | "timeout";

type ApiClientErrorOptions = {
  code?: ApiErrorCode;
  details?: unknown[];
  kind: ApiClientErrorKind;
  requestId?: string;
  status?: number;
};

class ApiClientError extends Error {
  readonly code: ApiErrorCode | undefined;
  readonly details: unknown[] | undefined;
  readonly kind: ApiClientErrorKind;
  readonly requestId: string | undefined;
  readonly status: number | undefined;

  constructor(message: string, options: ApiClientErrorOptions) {
    super(message);
    this.name = "ApiClientError";
    this.code = options.code;
    this.details = options.details;
    this.kind = options.kind;
    this.requestId = options.requestId;
    this.status = options.status;
  }
}

function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isCancel(error)) {
    return new ApiClientError("The request was cancelled.", { kind: "cancelled" });
  }

  if (axios.isAxiosError<unknown>(error)) {
    const response = apiErrorResponseSchema.safeParse(error.response?.data);
    const status = error.response?.status;
    const kind: ApiClientErrorKind =
      error.code === "ECONNABORTED" || error.code === "ETIMEDOUT"
        ? "timeout"
        : status === undefined
          ? "network"
          : "http";

    return new ApiClientError(
      response.success ? response.data.error.message : error.message || "The API request failed.",
      {
        code: response.success ? response.data.error.code : undefined,
        details: response.success ? response.data.error.details : undefined,
        kind,
        requestId: response.success ? response.data.error.requestId : undefined,
        status,
      },
    );
  }

  return new ApiClientError(
    error instanceof Error ? error.message : "An unexpected API error occurred.",
    { kind: "network" },
  );
}

export { apiClient, ApiClientError, toApiClientError, type ApiClientErrorKind };
