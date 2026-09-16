import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

import { AppError } from "@/errors/index.js";
import type { AppEnv } from "@/types.js";

import type { AuthSession } from "./models.js";
import type { AuthService } from "./service.js";

function createSessionMiddleware(auth: AuthService) {
  return createMiddleware<AppEnv>(async (context, next) => {
    context.set("authSession", await auth.getSession(context.req.raw.headers));

    await next();
  });
}

function getAuthenticatedSession(context: Context<AppEnv>): AuthSession {
  const session = context.get("authSession");

  if (session === null) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  }

  return session;
}

function createRequireVerifiedSessionMiddleware() {
  return createMiddleware<AppEnv>(async (context, next) => {
    const session = getAuthenticatedSession(context);

    if (!session.user.emailVerified) {
      throw new AppError(
        403,
        "EMAIL_VERIFICATION_REQUIRED",
        "Verify your email address to continue.",
      );
    }

    await next();
  });
}

export { createRequireVerifiedSessionMiddleware, createSessionMiddleware, getAuthenticatedSession };
