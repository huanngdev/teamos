import { MockLogLayer } from "loglayer";
import { describe, expect, test } from "bun:test";

import type { UserGateway } from "@/auth/index.js";
import { AppError } from "@/errors/index.js";
import {
  createUnavailableUserProfileService,
  createUserProfileService,
} from "@/services/user-profile.js";

function buildAuthUser(name = "Ada Lovelace") {
  return {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    email: "ada@example.com",
    emailVerified: true,
    id: "user-1",
    image: null,
    name,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function buildBetterAuthError(statusCode: number): Error {
  const error = new Error("Better Auth error") as Error & { statusCode: number };

  error.statusCode = statusCode;

  return error;
}

interface Harness {
  calls: { headers: Headers; name: string }[];
  gateway: UserGateway;
}

function createHarness(options: { onUpdateError?: unknown } = {}): Harness {
  const calls: Harness["calls"] = [];

  const gateway: UserGateway = {
    updateUser: async (input) => {
      if (options.onUpdateError !== undefined) {
        throw options.onUpdateError;
      }

      calls.push(input);

      return { headers: input.headers, user: buildAuthUser(input.name) };
    },
  };

  return { calls, gateway };
}

describe("createUserProfileService", () => {
  test("updates the profile through the gateway and maps the user", async () => {
    const harness = createHarness();
    const service = createUserProfileService({
      gateway: harness.gateway,
      logger: new MockLogLayer(),
    });
    const headers = new Headers({ cookie: "better-auth.session_token=value" });

    const result = await service.updateProfile({ headers, name: "Ada Lovelace", userId: "user-1" });

    expect(harness.calls).toHaveLength(1);
    expect(harness.calls[0]?.name).toBe("Ada Lovelace");
    expect(harness.calls[0]?.headers).toBe(headers);
    expect(result.user).toEqual({
      email: "ada@example.com",
      emailVerified: true,
      id: "user-1",
      image: null,
      name: "Ada Lovelace",
    });
  });

  test("maps an unauthenticated Better Auth error to 401", async () => {
    const harness = createHarness({ onUpdateError: buildBetterAuthError(401) });
    const service = createUserProfileService({
      gateway: harness.gateway,
      logger: new MockLogLayer(),
    });

    const error = await service
      .updateProfile({ headers: new Headers(), name: "Ada", userId: "user-1" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).status).toBe(401);
    expect((error as AppError).code).toBe("UNAUTHENTICATED");
  });

  test("maps an unexpected Better Auth error to a safe gateway error", async () => {
    const harness = createHarness({ onUpdateError: new Error("database exploded") });
    const service = createUserProfileService({
      gateway: harness.gateway,
      logger: new MockLogLayer(),
    });

    const error = await service
      .updateProfile({ headers: new Headers(), name: "Ada", userId: "user-1" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).status).toBe(502);
    expect((error as AppError).message).not.toContain("database exploded");
  });
});

test("the unavailable service rejects with a safe error", async () => {
  const service = createUnavailableUserProfileService();
  const error = await service
    .updateProfile({ headers: new Headers(), name: "Ada", userId: "user-1" })
    .catch((caught: unknown) => caught);

  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).status).toBe(502);
});
