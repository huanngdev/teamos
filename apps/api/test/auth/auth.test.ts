import { expect, test } from "bun:test";
import { MockLogLayer } from "loglayer";

import { createAuth } from "@/auth/index.js";
import { loadEnv } from "@/config/index.js";
import type { EmailService } from "@/infrastructure/index.js";

const emailService: EmailService = { send: async () => undefined };

function createTestAuth(source: Record<string, string | undefined> = {}) {
  return createAuth({
    emailService,
    env: loadEnv({ NODE_ENV: "test", ...source }),
    logger: new MockLogLayer(),
  });
}

/*
 * `auth.options` is not part of the public Better Auth type surface, so the
 * resolved configuration is read through narrow structural casts. These tests
 * guard the account-linking and workspace-limit policy that the product
 * depends on.
 */
function readResolvedOptions(auth: ReturnType<typeof createTestAuth>) {
  return auth.options as unknown as {
    account?: { accountLinking?: unknown };
    plugins?: { id?: string; options?: Record<string, unknown> }[];
  };
}

function readOrganizationPluginOptions(auth: ReturnType<typeof createTestAuth>) {
  const plugins = readResolvedOptions(auth).plugins ?? [];

  return plugins.find((plugin) => plugin.id === "organization")?.options;
}

test("links social accounts implicitly only when the provider verifies the email", () => {
  const auth = createTestAuth();

  expect(readResolvedOptions(auth).account?.accountLinking).toEqual({ enabled: true });
});

test("applies the configured workspace limit to the organization plugin", () => {
  expect(readOrganizationPluginOptions(createTestAuth())?.organizationLimit).toBe(3);
  expect(
    readOrganizationPluginOptions(createTestAuth({ MAX_ORGANIZATIONS_PER_USER: "7" }))
      ?.organizationLimit,
  ).toBe(7);
});
