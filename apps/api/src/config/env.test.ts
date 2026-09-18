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
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PASSWORD: "gmail-app-password",
  SMTP_USER: "notifications@example.com",
  EMAIL_FROM: "TeamOS <notifications@example.com>",
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
  expect(() => loadEnv({ NODE_ENV: "production" })).toThrow("SMTP_HOST");
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

test("requires email delivery variables to be configured together", () => {
  expect(() => loadEnv({ SMTP_HOST: "smtp.gmail.com" })).toThrow(
    "SMTP_HOST, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM must be configured together.",
  );
});

test("treats blank email delivery variables as unconfigured", () => {
  const env = loadEnv({ SMTP_HOST: "", SMTP_USER: "", SMTP_PASSWORD: "", EMAIL_FROM: "" });

  expect(env.SMTP_HOST).toBeUndefined();
  expect(env.SMTP_PORT).toBe(465);
  expect(env.SMTP_SECURE).toBe(true);
  expect(loadEnv({ SMTP_SECURE: "false" }).SMTP_SECURE).toBe(false);
});

test("defaults and validates the workspace limit", () => {
  expect(loadEnv({ NODE_ENV: "development" }).MAX_ORGANIZATIONS_PER_USER).toBe(3);
  expect(loadEnv({ MAX_ORGANIZATIONS_PER_USER: "5" }).MAX_ORGANIZATIONS_PER_USER).toBe(5);
  expect(() => loadEnv({ MAX_ORGANIZATIONS_PER_USER: "0" })).toThrow("MAX_ORGANIZATIONS_PER_USER");
  expect(() => loadEnv({ MAX_ORGANIZATIONS_PER_USER: "2.5" })).toThrow(
    "MAX_ORGANIZATIONS_PER_USER",
  );
  expect(() => loadEnv({ MAX_ORGANIZATIONS_PER_USER: "unlimited" })).toThrow(
    "MAX_ORGANIZATIONS_PER_USER",
  );
});
