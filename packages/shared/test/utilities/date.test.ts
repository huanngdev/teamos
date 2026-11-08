import { describe, expect, test } from "bun:test";

import { formatDate, formatDateTime } from "./date.js";

describe("formatDate", () => {
  test("formats an ISO timestamp with a short month and the year", () => {
    const formatted = formatDate("2026-01-05T00:00:00.000Z");

    expect(formatted).toContain("2026");
    expect(formatted).toContain("Jan");
  });

  test("accepts a Date instance", () => {
    expect(formatDate(new Date("2026-01-05T00:00:00.000Z"))).toContain("2026");
  });
});

describe("formatDateTime", () => {
  test("includes hours and minutes with the calendar date", () => {
    const formatted = formatDateTime("2026-01-05T15:30:00.000Z");

    expect(formatted).toContain("2026");
    expect(formatted).toContain("Jan");
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });
});
