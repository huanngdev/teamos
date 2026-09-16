import { expect, test } from "bun:test";

import { loadEnv } from "@/config/index.js";

const productionSource = {
  BETTER_AUTH_SECRET: "production-auth-secret-with-at-least-32-characters",
  BETTER_AUTH_URL: "https://api.example.com",
  DATABASE_URL: "postgresql://prod:secret@db.example.com:5432/teamos",
  GITHUB_CLIENT_ID: "github-client-id",
  GITHUB_CLIENT_SECRET: "github-client-secret",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  MINIO_ACCESS_KEY: "access",
  MINIO_ENDPOINT: "https://objects.example.com",
  MINIO_SECRET_KEY: "secret",
  NODE_ENV: "production",
  REDIS_URL: "rediss://redis.example.com:6380",
  RESEND_API_KEY: "resend-api-key",
  RESEND_FROM_EMAIL: "TeamOS <no-reply@example.com>",
  WEB_URL: "https://app.example.com",
};

test("enables API docs by default outside production", () => {
  expect(loadEnv({ NODE_ENV: "development" }).API_DOCS_ENABLED).toBe(true);
  expect(loadEnv({ NODE_ENV: "test" }).API_DOCS_ENABLED).toBe(true);
});

test("rejects service URLs with the wrong protocol", () => {
  expect(() => loadEnv({ DATABASE_URL: "redis://localhost:6379" })).toThrow(
    "URL must use one of: postgres:, postgresql:",
  );
});

test("requires explicit service and authentication configuration in production", () => {
  expect(() => loadEnv({ NODE_ENV: "production" })).toThrow("Missing production variables:");
  expect(() => loadEnv({ NODE_ENV: "production" })).toThrow("BETTER_AUTH_SECRET");
  expect(() => loadEnv({ NODE_ENV: "production" })).toThrow("GOOGLE_CLIENT_ID");
  expect(() => loadEnv({ NODE_ENV: "production" })).toThrow("RESEND_API_KEY");
});

test("accepts explicit production service configuration", () => {
  const env = loadEnv({ ...productionSource, API_DOCS_ENABLED: "true" });

  expect(env.API_DOCS_ENABLED).toBe(true);
  expect(env.BETTER_AUTH_URL).toBe("https://api.example.com");
});

test("requires social provider credentials to be configured together", () => {
  expect(() => loadEnv({ GOOGLE_CLIENT_ID: "google-client-id" })).toThrow(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together.",
  );
  expect(() => loadEnv({ GITHUB_CLIENT_SECRET: "github-client-secret" })).toThrow(
    "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured together.",
  );
});

test("requires Resend credentials to be configured together", () => {
  expect(() => loadEnv({ RESEND_API_KEY: "resend-api-key" })).toThrow(
    "RESEND_API_KEY and RESEND_FROM_EMAIL must be configured together.",
  );
});
