import { useState } from "react";
import { useNavigate } from "react-router";

import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";

function useSignOut() {
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  const signOut = async (): Promise<void> => {
    setIsPending(true);

    try {
      await authClient.signOut();
    } finally {
      queryClient.clear();
      setIsPending(false);
      void navigate("/login", { replace: true });
    }
  };

  return { isPending, signOut };
}

export { useSignOut };
