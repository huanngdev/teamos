import { useState } from "react";
import { useNavigate } from "react-router";

import { authClient } from "../api/auth-client";
import { readAuthClientError } from "../api/auth-error";
import { queryClient } from "@/shared/query/query-client";

/*
 * Sign-out only clears local state after the server confirms it. A failed
 * request keeps the user where they are with a retryable message instead of
 * bouncing them into an immediate re-authentication loop.
 */
function useSignOut() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const signOut = async (): Promise<void> => {
    setErrorMessage(null);
    setIsPending(true);

    try {
      const { error } = await authClient.signOut();

      if (error !== null) {
        setErrorMessage(readAuthClientError(error).message ?? "You could not be signed out.");
        return;
      }

      queryClient.clear();
      void navigate("/login", { replace: true });
    } catch {
      setErrorMessage("You could not be signed out.");
    } finally {
      setIsPending(false);
    }
  };

  return { errorMessage, isPending, signOut };
}

export { useSignOut };
