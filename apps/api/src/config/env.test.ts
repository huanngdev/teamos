import { expect, test } from "bun:test";

import { loadEnv } from "@/config/index.js";

test("enables API docs by default outside production", () => {
  expect(loadEnv({ NODE_ENV: "development" }).API_DOCS_ENABLED).toBe(true);
  expect(loadEnv({ NODE_ENV: "test" }).API_DOCS_ENABLED).toBe(true);
});

test("rejects service URLs with the wrong protocol", () => {
  expect(() => loadEnv({ DATABASE_URL: "redis://localhost:6379" })).toThrow(
    "URL must use one of: postgres:, postgresql:",
  );
});

test("requires explicit service configuration in production", () => {
  expect(() => loadEnv({ NODE_ENV: "production" })).toThrow(
    "Missing production variables: DATABASE_URL, REDIS_URL, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY",
  );
});

test("accepts explicit production service configuration", () => {
  const env = loadEnv({
    API_DOCS_ENABLED: "true",
    DATABASE_URL: "postgresql://prod:secret@db.example.com:5432/teamos",
    MINIO_ACCESS_KEY: "access",
    MINIO_ENDPOINT: "https://objects.example.com",
    MINIO_SECRET_KEY: "secret",
    NODE_ENV: "production",
    REDIS_URL: "rediss://redis.example.com:6380",
  });

  expect(env.API_DOCS_ENABLED).toBe(true);
});
