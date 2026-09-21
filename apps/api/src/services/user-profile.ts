import type { ILogLayer } from "loglayer";
import type { AuthenticatedUser } from "@teamos/shared";

import { toAuthenticatedUser, type UserGateway } from "@/auth/index.js";
import { AppError } from "@/errors/index.js";

interface UserProfileService {
  updateProfile: (input: {
    headers: Headers;
    name: string;
    userId: string;
  }) => Promise<{ headers: Headers; user: AuthenticatedUser }>;
}

interface UserProfileDependencies {
  gateway: UserGateway;
  logger: ILogLayer;
}

/*
 * Better Auth error fields are read with runtime narrowing so an unexpected
 * shape cannot crash the error path.
 */
function readStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) {
    return undefined;
  }

  return typeof error.statusCode === "number" ? error.statusCode : undefined;
}

/*
 * Better Auth owns the mutation, so its failures are translated into the TeamOS
 * error contract without echoing provider internals or database details.
 */
function toProfileError(error: unknown): AppError {
  const statusCode = readStatusCode(error);

  if (statusCode === 401) {
    return new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  }

  if (statusCode === 403) {
    return new AppError(403, "FORBIDDEN", "You are not allowed to update this profile.");
  }

  return new AppError(
    502,
    "HTTP_ERROR",
    "The authentication service could not complete the request.",
  );
}

/*
 * Profile edits deliberately log only the actor and which fields changed. The
 * submitted name is personal data, so it never enters the audit record.
 */
function createUserProfileService(dependencies: UserProfileDependencies): UserProfileService {
  const { gateway, logger } = dependencies;

  return {
    updateProfile: async ({ headers, name, userId }) => {
      let updated: Awaited<ReturnType<UserGateway["updateUser"]>>;

      try {
        updated = await gateway.updateUser({ headers, name });
      } catch (error) {
        throw toProfileError(error);
      }

      logger
        .withMetadata({ actorUserId: userId, changedFields: ["name"] })
        .info("user.profile.updated");

      return { headers: updated.headers, user: toAuthenticatedUser(updated.user) };
    },
  };
}

/*
 * Mirrors the readiness fallback: when profile dependencies are not composed the
 * endpoint reports an unavailable service instead of mutating through a partial
 * dependency graph.
 */
function createUnavailableUserProfileService(): UserProfileService {
  return {
    updateProfile: async () => {
      throw new AppError(502, "HTTP_ERROR", "Profile updates are temporarily unavailable.");
    },
  };
}

export { createUnavailableUserProfileService, createUserProfileService, type UserProfileService };
