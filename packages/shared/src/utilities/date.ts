/*
 * Formats an ISO timestamp or `Date` as a short, locale-aware calendar date
 * (for example `Jan 5, 2026`). Timestamps are stored in UTC and localized only
 * at the display boundary, so only the browser locale is used here.
 */
function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export { formatDate };
