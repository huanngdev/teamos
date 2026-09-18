import { useState } from "react";
import type { SocialProviderId } from "@teamos/shared";

import { notify } from "@/shared";
import { authClient } from "../api/auth-client";

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
      const message = error.message ?? "Sign-in could not be started.";
      setErrorMessage(message);
      notify.error(message);
      setPendingProvider(null);
    }
  };

  return { errorMessage, pendingProvider, signIn };
}

export { useSocialSignIn };
