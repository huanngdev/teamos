import { expect, test } from "bun:test";
import { MockLogLayer } from "loglayer";
import { drizzleStudioUrl } from "@teamos/db";

import {
  buildReadyLogMetadata,
  closeServices,
  connectServices,
  StartupError,
  type ServiceResource,
} from "@/bootstrap.js";
import { loadEnv } from "@/config/index.js";

function createService(
  name: ServiceResource["name"],
  connect: ServiceResource["connect"],
  close: ServiceResource["close"],
): ServiceResource {
  return { close, connect, name };
}

test("connects all required services before startup can continue", async () => {
  const connected: string[] = [];
  const services = [
    createService(
      "database",
      async () => {
        connected.push("database");
      },
      async () => undefined,
    ),
    createService(
      "redis",
      async () => {
        connected.push("redis");
      },
      async () => undefined,
    ),
    createService(
      "storage",
      async () => {
        connected.push("storage");
      },
      async () => undefined,
    ),
  ];

  await connectServices(services, 100, new MockLogLayer());

  expect(connected.sort()).toEqual(["database", "redis", "storage"]);
});

test("reports failed services and closes resources during cleanup", async () => {
  const closed: string[] = [];
  const services = [
    createService(
      "database",
      async () => undefined,
      async () => {
        closed.push("database");
      },
    ),
    createService(
      "redis",
      async () => {
        throw new Error("connection refused");
      },
      async () => {
        closed.push("redis");
      },
    ),
    createService(
      "storage",
      async () => undefined,
      async () => {
        closed.push("storage");
      },
    ),
  ];

  let error: unknown;
  try {
    await connectServices(services, 100, new MockLogLayer());
  } catch (caught) {
    error = caught;
  }

  await closeServices(services, new MockLogLayer());

  expect(error).toBeInstanceOf(StartupError);
  if (!(error instanceof StartupError)) {
    throw new Error("Expected a StartupError.");
  }

  expect(error.services).toEqual(["redis"]);
  expect(closed.sort()).toEqual(["database", "redis", "storage"]);
});

test("logs the Drizzle Studio URL next to the API URL in development", () => {
  const development = buildReadyLogMetadata(
    loadEnv({ NODE_ENV: "development" }),
    "http://localhost:4001",
  );
  const nonDevelopment = buildReadyLogMetadata(
    loadEnv({ NODE_ENV: "test" }),
    "https://api.example.com",
  );

  expect(development).toEqual({
    apiUrl: "http://localhost:4001",
    drizzleStudioUrl,
  });
  expect(nonDevelopment).toEqual({ apiUrl: "https://api.example.com" });
});
