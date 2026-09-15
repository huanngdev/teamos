import { createMiddleware } from "hono/factory";
import type { IRateLimiterRes, RateLimiterLike } from "rate-limiter-flexible";

import { AppError } from "@/errors/index.js";
import type { AppEnv } from "@/types.js";

interface RateLimitOptions {
  enabled: boolean;
  limiter: RateLimiterLike;
  points: number;
}

function isRateLimiterResponse(value: unknown): value is IRateLimiterRes {
  return (
    typeof value === "object" &&
    value !== null &&
    "msBeforeNext" in value &&
    typeof value.msBeforeNext === "number"
  );
}

function createRateLimitMiddleware(options: RateLimitOptions) {
  return createMiddleware<AppEnv>(async (context, next) => {
    if (
      !options.enabled ||
      context.req.path === "/health" ||
      context.req.path.startsWith("/health/")
    ) {
      await next();
      return;
    }

    try {
      const result = await options.limiter.consume(`ip:${context.get("clientIp")}`);
      const remaining = result.remainingPoints;
      const resetAt = Date.now() + result.msBeforeNext;

      context.header("X-RateLimit-Limit", String(options.points));
      context.header("X-RateLimit-Remaining", String(Math.max(0, remaining)));
      context.header("X-RateLimit-Reset", String(Math.ceil(resetAt / 1_000)));
      await next();
    } catch (error: unknown) {
      if (isRateLimiterResponse(error)) {
        const msBeforeNext = error.msBeforeNext ?? 1_000;
        const retryAfter = Math.max(1, Math.ceil(msBeforeNext / 1_000));

        context.header("Retry-After", String(retryAfter));
        context.header("X-RateLimit-Limit", String(options.points));
        context.header("X-RateLimit-Remaining", "0");
        context.header("X-RateLimit-Reset", String(Math.ceil((Date.now() + msBeforeNext) / 1_000)));

        throw new AppError(
          429,
          "RATE_LIMIT_EXCEEDED",
          "Too many requests. Please try again later.",
        );
      }

      throw new AppError(
        503,
        "RATE_LIMIT_UNAVAILABLE",
        "Request protection is temporarily unavailable.",
      );
    }
  });
}

export { createRateLimitMiddleware };
