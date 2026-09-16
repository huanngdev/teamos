import type { SocialProvider, SocialProviderId } from "@teamos/shared";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const providerIconSources: Record<SocialProviderId, string> = {
  github: "/logo/github-icon.svg",
  google: "/logo/google-icon.svg",
};

interface ProviderIconProps {
  providerId: SocialProviderId;
}

function ProviderIcon({ providerId }: ProviderIconProps) {
  return (
    <img
      alt=""
      className={cn("size-4", providerId === "github" && "dark:invert")}
      data-icon="inline-start"
      src={providerIconSources[providerId]}
    />
  );
}

interface AuthProviderButtonsProps {
  onSelect: (provider: SocialProviderId) => void;
  pendingProvider: SocialProviderId | null;
  providers: readonly SocialProvider[];
}

function AuthProviderButtons({ onSelect, pendingProvider, providers }: AuthProviderButtonsProps) {
  if (providers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sign-in provider is configured yet. An administrator must add OAuth credentials.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          className="w-full"
          disabled={pendingProvider !== null}
          onClick={() => onSelect(provider.id)}
          type="button"
          variant="outline"
        >
          {pendingProvider === provider.id ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <ProviderIcon providerId={provider.id} />
          )}
          Continue with {provider.name}
        </Button>
      ))}
    </div>
  );
}

export { AuthProviderButtons };
