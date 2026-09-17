import type { ILogLayer } from "loglayer";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import type { Database } from "@teamos/db";
import * as schema from "@teamos/db/schema";

/*
 * Relative imports keep this module loadable by the Better Auth CLI, which
 * runs under Node and does not resolve the `@/*` path alias.
 */
import type { Env } from "../config/index.js";
import {
  buildOrganizationInvitationEmail,
  buildVerificationEmail,
  type EmailService,
} from "../infrastructure/email/index.js";
import { organizationLifecycleHooks } from "./native-endpoint-policy.js";
import { getSocialProviderCredentials } from "./providers.js";

const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;

interface CreateAuthOptions {
  db?: Database;
  emailService: EmailService;
  env: Env;
  logger: ILogLayer;
}

function buildSocialProviders(env: Env) {
  const google = getSocialProviderCredentials(env, "google");
  const github = getSocialProviderCredentials(env, "github");

  return {
    ...(google === undefined
      ? {}
      : { google: { ...google, requireEmailVerification: true as const } }),
    ...(github === undefined
      ? {}
      : { github: { ...github, requireEmailVerification: true as const } }),
  };
}

function createAuth(options: CreateAuthOptions) {
  const { env, logger, emailService } = options;
  const trustedOrigins = Array.from(new Set([...env.CORS_ORIGINS, env.WEB_URL]));

  /*
   * Delivery failures are logged and then rethrown. Swallowing them would make
   * an endpoint report success while the user never receives the link, which is
   * worse than a visible, retryable failure. Better Auth persists an invitation
   * before sending its email, so callers must refresh the invitation list after
   * a failure instead of assuming nothing was created.
   */
  const deliver = async (message: Parameters<EmailService["send"]>[0]): Promise<void> => {
    try {
      await emailService.send(message);
    } catch (error) {
      logger
        .withError(error)
        .withMetadata({ emailSubject: message.subject })
        .error("authentication email delivery failed");
      throw error;
    }
  };

  return betterAuth({
    account: {
      accountLinking: {
        enabled: true,
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    database:
      options.db === undefined
        ? undefined
        : drizzleAdapter(options.db, {
            provider: "pg",
            schema,
          }),
    emailVerification: {
      autoSignInAfterVerification: true,
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        await deliver({
          ...buildVerificationEmail({ name: user.name, url }),
          to: user.email,
        });
      },
    },
    hooks: organizationLifecycleHooks,
    plugins: [
      organization({
        /*
         * Re-inviting cancels the previous invitation and issues a new one, so
         * the previously emailed link stops working instead of staying valid.
         */
        cancelPendingInvitationsOnReInvite: true,
        invitationLimit: env.MAX_PENDING_INVITATIONS,
        membershipLimit: env.MAX_ORGANIZATION_MEMBERS,
        organizationLimit: env.MAX_ORGANIZATIONS_PER_USER,
        requireEmailVerificationOnInvitation: true,
        sendInvitationEmail: async (data) => {
          await deliver({
            ...buildOrganizationInvitationEmail({
              inviteLink: `${env.WEB_URL}/invitations/${data.id}`,
              inviterName: data.inviter.user.name,
              organizationName: data.organization.name,
            }),
            to: data.email,
          });
        },
      }),
    ],
    secret: env.BETTER_AUTH_SECRET,
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
    },
    socialProviders: buildSocialProviders(env),
    trustedOrigins,
  });
}

type Auth = ReturnType<typeof createAuth>;

export {
  buildSocialProviders,
  createAuth,
  SESSION_EXPIRES_IN_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
  type Auth,
  type CreateAuthOptions,
};
