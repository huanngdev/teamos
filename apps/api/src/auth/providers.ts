import type { SocialProvider, SocialProviderId } from "@teamos/shared";

import type { Env } from "@/config/index.js";

interface SocialProviderDefinition {
  id: SocialProviderId;
  name: string;
}

interface SocialProviderCredentials {
  clientId: string;
  clientSecret: string;
}

const socialProviderDefinitions = [
  { id: "google", name: "Google" },
  { id: "github", name: "GitHub" },
] as const satisfies readonly SocialProviderDefinition[];

function getSocialProviderCredentials(
  env: Env,
  id: SocialProviderId,
): SocialProviderCredentials | undefined {
  switch (id) {
    case "google":
      if (env.GOOGLE_CLIENT_ID === undefined || env.GOOGLE_CLIENT_SECRET === undefined) {
        return undefined;
      }

      return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
    case "github":
      if (env.GITHUB_CLIENT_ID === undefined || env.GITHUB_CLIENT_SECRET === undefined) {
        return undefined;
      }

      return { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
  }
}

function getEnabledSocialProviders(env: Env): SocialProvider[] {
  return socialProviderDefinitions.map((definition) => ({
    enabled: getSocialProviderCredentials(env, definition.id) !== undefined,
    id: definition.id,
    name: definition.name,
  }));
}

export { getEnabledSocialProviders, getSocialProviderCredentials, socialProviderDefinitions };
