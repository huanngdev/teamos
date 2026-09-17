import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { apiErrorResponseSchema, type ApiErrorCode } from "@teamos/shared";
import type { z } from "zod";

import { apiUrl } from "@/shared/api/env";

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

/*
 * Shared request helpers so every API module maps transport failures the same
 * way and validates the response with the shared runtime contract instead of
 * trusting the wire shape.
 */
async function requestParsed<Output>(
  schema: z.ZodType<Output>,
  config: AxiosRequestConfig,
): Promise<Output> {
  try {
    const response = await apiClient.request<unknown>(config);
    const parsed = schema.safeParse(response.data);

    if (!parsed.success) {
      throw new ApiClientError("The API returned an invalid response.", {
        kind: "invalid-response",
        status: response.status,
      });
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw toApiClientError(error);
  }
}

async function requestVoid(config: AxiosRequestConfig): Promise<void> {
  try {
    await apiClient.request(config);
  } catch (error) {
    throw toApiClientError(error);
  }
}

export {
  apiClient,
  ApiClientError,
  requestParsed,
  requestVoid,
  toApiClientError,
  type ApiClientErrorKind,
};
