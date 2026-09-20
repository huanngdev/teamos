const defaultFallback = "/";

/*
 * A redirect target is only meaningful if it stays inside this application.
 * Protocol-relative (`//evil.example`), absolute, backslash, and control-char
 * values are rejected so a query parameter can never become an open redirect.
 */
function readSafeRedirectPath(value: string | null, fallback = defaultFallback): string {
  if (value === null) {
    return fallback;
  }

  const candidate = value.trim();

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    candidate.includes("\n") ||
    candidate.includes("\r")
  ) {
    return fallback;
  }

  return candidate;
}

function buildVerifyEmailPath(nextPath: string): string {
  return `/auth/verify-email?next=${encodeURIComponent(nextPath)}`;
}

export { buildVerifyEmailPath, readSafeRedirectPath };
