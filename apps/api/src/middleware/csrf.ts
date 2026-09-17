import { createMiddleware } from "hono/factory";

import { AppError } from "@/errors/index.js";
import type { AppEnv } from "@/types.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

/*
 * Only these content types can be produced by a cross-origin HTML form, so they
 * are the only requests that can reach the API without a CORS preflight. JSON
 * and other non-form bodies always trigger a preflight that the CORS allowlist
 * already rejects.
 */
const formContentTypePattern =
  /^\b(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)\b/i;

interface CsrfProtectionOptions {
  allowedOrigins: readonly string[];
}

/*
 * Replaces the Hono CSRF middleware, which treats a missing Content-Type as
 * `text/plain` and therefore rejects any bodyless unsafe request such as a
 * DELETE. This keeps the same protection for form-encodable requests while
 * letting bodyless requests through to the CORS-protected route handlers.
 */
function createCsrfProtection(options: CsrfProtectionOptions) {
  return createMiddleware<AppEnv>(async (context, next) => {
    if (safeMethods.has(context.req.method)) {
      await next();
      return;
    }

    const contentType = context.req.header("content-type") ?? "";

    if (formContentTypePattern.test(contentType)) {
      const fetchSite = context.req.header("sec-fetch-site");
      const origin = context.req.header("origin");
      const isAllowed =
        fetchSite === "same-origin" ||
        (origin !== undefined && options.allowedOrigins.includes(origin));

      if (!isAllowed) {
        throw new AppError(403, "FORBIDDEN", "The request origin is not allowed.");
      }
    }

    await next();
  });
}

export { createCsrfProtection };
