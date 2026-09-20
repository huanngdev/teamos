import { createMiddleware } from "hono/factory";

import { AppError } from "@/errors/index.js";
import type { AppEnv } from "@/types.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

/* Sec-Fetch-Site values that prove a request came from another site. */
const crossSiteFetchSites = new Set(["cross-site", "same-site"]);

interface CsrfProtectionOptions {
  allowedOrigins: readonly string[];
}

/*
 * Replaces the Hono CSRF middleware, which treats a missing Content-Type as
 * `text/plain` and therefore rejects any bodyless unsafe request such as a
 * DELETE. Every unsafe cookie-authenticated request is validated against the
 * Origin allowlist or Fetch Metadata, regardless of whether it carries a body.
 * Requests with neither signal are non-browser clients and stay allowed.
 */
function createCsrfProtection(options: CsrfProtectionOptions) {
  return createMiddleware<AppEnv>(async (context, next) => {
    if (safeMethods.has(context.req.method)) {
      await next();
      return;
    }

    const fetchSite = context.req.header("sec-fetch-site");
    const origin = context.req.header("origin");
    const originAllowed = origin !== undefined && options.allowedOrigins.includes(origin);
    const isAllowed = fetchSite === "same-origin" || originAllowed;

    /*
     * `same-site` covers sibling subdomains, which SameSite=Lax does not block.
     * Any present-but-untrusted Origin is rejected even without Fetch Metadata.
     */
    const hasCrossSiteEvidence =
      (fetchSite !== undefined && crossSiteFetchSites.has(fetchSite)) ||
      (origin !== undefined && !originAllowed);

    if (!isAllowed && hasCrossSiteEvidence) {
      throw new AppError(403, "FORBIDDEN", "The request origin is not allowed.");
    }

    await next();
  });
}

export { createCsrfProtection };
