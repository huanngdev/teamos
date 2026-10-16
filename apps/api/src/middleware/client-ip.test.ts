import { expect, test } from "bun:test";

import { resolveClientIp } from "@/middleware/client-ip.js";

function requestWithForwardedFor(value?: string): Request {
  const headers = new Headers();

  if (value !== undefined) {
    headers.set("x-forwarded-for", value);
  }

  return new Request("http://localhost/", { headers });
}

test("ignores forwarded headers unless the proxy is trusted", () => {
  expect(resolveClientIp(requestWithForwardedFor("203.0.113.7"), "172.18.0.5", false)).toBe(
    "172.18.0.5",
  );
});

test("uses the address the trusted proxy appended", () => {
  expect(
    resolveClientIp(requestWithForwardedFor("10.0.0.1, 203.0.113.7"), "172.18.0.5", true),
  ).toBe("203.0.113.7");
});

test("falls back to the socket address when a trusted proxy sends no forwarded header", () => {
  expect(resolveClientIp(requestWithForwardedFor(), "172.18.0.5", true)).toBe("172.18.0.5");
  expect(resolveClientIp(requestWithForwardedFor(" "), "172.18.0.5", true)).toBe("172.18.0.5");
});
