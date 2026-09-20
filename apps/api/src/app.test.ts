import { MockLogLayer } from "loglayer";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { expect, test } from "bun:test";
import {
  apiErrorResponseSchema,
  healthStatusSchema,
  readinessStatusSchema,
  rootResponseSchema,
} from "@teamos/shared";
import { z } from "zod";

import { createApp } from "@/app.js";
import { loadEnv } from "@/config/index.js";
import { createReadinessService, type ReadinessService } from "@/services/index.js";
import { zValidator } from "@/validation/index.js";

const testEnvSource = {
  NODE_ENV: "test",
  RATE_LIMIT_ENABLED: "false",
};

function createTestApp(overrides: { maxBodyBytes?: number; readiness?: ReadinessService } = {}) {
  const env = loadEnv({
    ...testEnvSource,
    ...(overrides.maxBodyBytes === undefined
      ? {}
      : { MAX_REQUEST_BODY_BYTES: String(overrides.maxBodyBytes) }),
  });

  return createApp({
    env,
    logger: new MockLogLayer(),
    readiness: overrides.readiness,
  });
}

async function readErrorResponse(response: Response) {
  const result = apiErrorResponseSchema.safeParse(await response.json());

  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error("Expected an API error response.");
  }

  return result.data;
}

test("applies security headers, CORS, and a generated request ID", async () => {
  const app = createTestApp();
  const response = await app.request("/", {
    headers: {
      Origin: "http://localhost:4000",
    },
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("X-Request-ID")).toMatch(/^[0-9a-f-]{36}$/);
  expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:4000");
  expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  expect(response.headers.get("X-Powered-By")).toBeNull();
});

test("returns documented root and liveness contracts", async () => {
  const app = createTestApp();
  const rootResponse = await app.request("/");
  const healthResponse = await app.request("/health");

  expect(rootResponseSchema.safeParse(await rootResponse.json()).success).toBe(true);
  expect(healthStatusSchema.safeParse(await healthResponse.json()).success).toBe(true);
});

test("serves OpenAPI JSON and Scalar documentation in test environments", async () => {
  const app = createTestApp();
  const documentResponse = await app.request("/openapi.json");
  const document = z
    .object({
      openapi: z.string(),
      paths: z.record(z.string(), z.unknown()),
    })
    .parse(await documentResponse.json());
  const scalarResponse = await app.request("/docs");

  expect(documentResponse.status).toBe(200);
  expect(document.openapi).toBe("3.1.0");
  expect(document.paths).toHaveProperty("/");
  expect(document.paths).toHaveProperty("/health");
  expect(document.paths).toHaveProperty("/health/ready");
  expect(scalarResponse.status).toBe(200);
  expect(await scalarResponse.text()).toContain("TeamOS API Reference");
});

test("reports dependency readiness without applying rate limits to health routes", async () => {
  const readiness = createReadinessService({
    database: async () => undefined,
    redis: async () => undefined,
    storage: async () => undefined,
  });
  const env = loadEnv({
    ...testEnvSource,
    RATE_LIMIT_ENABLED: "true",
    RATE_LIMIT_POINTS: "1",
  });
  const app = createApp({
    env,
    logger: new MockLogLayer(),
    rateLimiter: new RateLimiterMemory({ duration: 60, points: 1 }),
    readiness,
  });

  const firstResponse = await app.request("/health/ready");
  const secondResponse = await app.request("/health/ready");
  const body = readinessStatusSchema.safeParse(await firstResponse.json());

  expect(firstResponse.status).toBe(200);
  expect(secondResponse.status).toBe(200);
  expect(body.success).toBe(true);
});

test("returns 503 when a readiness dependency is unavailable", async () => {
  const readiness = createReadinessService({
    database: async () => undefined,
    redis: async () => {
      throw new Error("Redis unavailable");
    },
    storage: async () => undefined,
  });
  const app = createTestApp({ readiness });

  const response = await app.request("/health/ready");
  const body = readinessStatusSchema.safeParse(await response.json());

  expect(response.status).toBe(503);
  expect(body.success).toBe(true);
  if (body.success) {
    expect(body.data.status).toBe("error");
    expect(body.data.dependencies.redis.status).toBe("error");
  }
});

test("returns a stable error contract for unknown routes", async () => {
  const app = createTestApp();
  const response = await app.request("/missing");
  const body = await readErrorResponse(response);

  expect(response.status).toBe(404);
  expect(body.error.code).toBe("NOT_FOUND");
  expect(body.error.message).toBe("The requested resource was not found.");
  const requestId = response.headers.get("X-Request-ID");
  expect(requestId).not.toBeNull();
  if (requestId === null) {
    throw new Error("Expected a request ID header.");
  }

  expect(body.error.requestId).toBe(requestId);
  expect(JSON.stringify(body)).not.toContain("stack");
});

test("does not expose unexpected error details", async () => {
  const app = createTestApp();
  app.get("/failure", () => {
    throw new Error("private implementation detail");
  });

  const response = await app.request("/failure");
  const body = await readErrorResponse(response);

  expect(response.status).toBe(500);
  expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
  expect(body.error.message).toBe("Internal server error.");
  expect(JSON.stringify(body)).not.toContain("private implementation detail");
  expect(JSON.stringify(body)).not.toContain("stack");
});

test("rejects unsupported content types before a route reads the body", async () => {
  const app = createTestApp();
  app.post("/body", (context) => context.json({ ok: true }));

  const response = await app.request("/body", {
    body: "<xml />",
    headers: {
      "Content-Type": "application/xml",
    },
    method: "POST",
  });
  const body = await readErrorResponse(response);

  expect(response.status).toBe(415);
  expect(body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
});

test("returns a validation error for malformed JSON", async () => {
  const app = createTestApp();
  app.post("/validated", zValidator("json", z.object({ name: z.string() })), (context) =>
    context.json({ ok: true }),
  );

  const response = await app.request("/validated", {
    body: "{invalid",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = await readErrorResponse(response);

  expect(response.status).toBe(400);
  expect(body.error.code).toBe("INVALID_JSON");
});

test("returns a validation error for an invalid JSON shape", async () => {
  const app = createTestApp();
  app.post("/validated", zValidator("json", z.object({ name: z.string() })), (context) =>
    context.json({ ok: true }),
  );

  const response = await app.request("/validated", {
    body: JSON.stringify({}),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = await readErrorResponse(response);

  expect(response.status).toBe(422);
  expect(body.error.code).toBe("VALIDATION_ERROR");
});

test("enforces the request body size limit", async () => {
  const app = createTestApp({ maxBodyBytes: 4 });
  app.post("/body", (context) => context.json({ ok: true }));

  const response = await app.request("/body", {
    body: "hello",
    headers: {
      "Content-Type": "text/plain",
    },
    method: "POST",
  });
  const body = await readErrorResponse(response);

  expect(response.status).toBe(413);
  expect(body.error.code).toBe("REQUEST_BODY_TOO_LARGE");
});

test("returns rate limit headers and a 429 response", async () => {
  const env = loadEnv({
    ...testEnvSource,
    RATE_LIMIT_ENABLED: "true",
    RATE_LIMIT_DURATION_SECONDS: "60",
    RATE_LIMIT_POINTS: "1",
  });
  const app = createApp({
    env,
    logger: new MockLogLayer(),
    rateLimiter: new RateLimiterMemory({ duration: 60, points: 1 }),
  });

  const firstResponse = await app.request("/");
  const secondResponse = await app.request("/");
  const body = await readErrorResponse(secondResponse);

  expect(firstResponse.status).toBe(200);
  expect(firstResponse.headers.get("X-RateLimit-Limit")).toBe("1");
  expect(secondResponse.status).toBe(429);
  expect(secondResponse.headers.get("Retry-After")).toBeTruthy();
  expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
});

test("allows a bodyless unsafe request such as DELETE", async () => {
  const app = createTestApp();
  app.delete("/resource", (context) => context.body(null, 204));

  const response = await app.request("/resource", { method: "DELETE" });

  expect(response.status).toBe(204);
});

test("rejects a bodyless unsafe request that reports a cross-site fetch", async () => {
  const app = createTestApp();
  app.post("/resource", (context) => context.json({ ok: true }));

  const response = await app.request("/resource", {
    headers: { "Sec-Fetch-Site": "cross-site" },
    method: "POST",
  });
  const body = await readErrorResponse(response);

  expect(response.status).toBe(403);
  expect(body.error.code).toBe("FORBIDDEN");
});

test("rejects a bodyless unsafe request from a same-site sibling origin", async () => {
  const app = createTestApp();
  app.post("/resource", (context) => context.json({ ok: true }));

  const response = await app.request("/resource", {
    headers: { Origin: "https://evil.localhost:4000", "Sec-Fetch-Site": "same-site" },
    method: "POST",
  });

  expect(response.status).toBe(403);
});

test("rejects a bodyless unsafe request with an untrusted origin", async () => {
  const app = createTestApp();
  app.post("/resource", (context) => context.json({ ok: true }));

  const response = await app.request("/resource", {
    headers: { Origin: "https://attacker.example" },
    method: "POST",
  });

  expect(response.status).toBe(403);
});

test("allows a bodyless unsafe request from an allowlisted origin", async () => {
  const app = createTestApp();
  app.post("/resource", (context) => context.json({ ok: true }));

  const response = await app.request("/resource", {
    headers: { Origin: "http://localhost:4000" },
    method: "POST",
  });

  expect(response.status).toBe(200);
});

test("accepts a form request from an allowlisted origin", async () => {
  const app = createTestApp();
  app.post("/form", (context) => context.json({ ok: true }));

  const response = await app.request("/form", {
    body: "name=ada",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "http://localhost:4000",
    },
    method: "POST",
  });

  expect(response.status).toBe(200);
});

test("accepts a same-origin form request reported by the browser", async () => {
  const app = createTestApp();
  app.post("/form", (context) => context.json({ ok: true }));

  const response = await app.request("/form", {
    body: "name=ada",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Sec-Fetch-Site": "same-origin",
    },
    method: "POST",
  });

  expect(response.status).toBe(200);
});

test("rejects a cross-site form request without an allowed origin", async () => {
  const app = createTestApp();
  app.post("/form", (context) => context.json({ ok: true }));

  const response = await app.request("/form", {
    body: "name=ada",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://attacker.example",
    },
    method: "POST",
  });
  const body = await readErrorResponse(response);

  expect(response.status).toBe(403);
  expect(body.error.code).toBe("FORBIDDEN");
  expect(body.error.message.length).toBeGreaterThan(0);
});

test("rejects a form request that reports a cross-site fetch", async () => {
  const app = createTestApp();
  app.post("/form", (context) => context.json({ ok: true }));

  const response = await app.request("/form", {
    body: "name=ada",
    headers: {
      "Content-Type": "text/plain",
      "Sec-Fetch-Site": "cross-site",
    },
    method: "POST",
  });

  expect(response.status).toBe(403);
});
