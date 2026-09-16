import { useState } from "react";
import type { SocialProviderId } from "@teamos/shared";

import { authClient } from "@/lib/auth-client";

function useSocialSignIn() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<SocialProviderId | null>(null);

  const signIn = async (
    provider: SocialProviderId,
    callbackPath = "/auth/complete",
  ): Promise<void> => {
    setErrorMessage(null);
    setPendingProvider(provider);

    const { error } = await authClient.signIn.social({
      callbackURL: `${window.location.origin}${callbackPath}`,
      provider,
    });

    if (error) {
      setErrorMessage(error.message ?? "Sign-in could not be started.");
      setPendingProvider(null);
    }
  };

  return { errorMessage, pendingProvider, signIn };
}

export { useSocialSignIn };
