import { useLocation, useNavigate } from "react-router";

import { useAuthSession, useSignOut } from "@/features/auth";

type AccountLayoutState = { status: "loading" } | { status: "ready"; view: AccountLayoutView };

interface AccountLayoutView {
  isSigningOut: boolean;
  onBack: () => void;
  onSignOut: () => void;
  signOutError: string | null;
  user: { email: string; image: string | null; name: string };
}

/*
 * Orchestration for the account shell. It only reads the session and owns
 * sign-out and back navigation; account pages are identity-scoped, so nothing
 * here depends on a workspace or organization.
 */
function useAccountLayout(): AccountLayoutState {
  const session = useAuthSession();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const location = useLocation();

  if (session.status !== "authenticated") {
    return { status: "loading" };
  }

  return {
    status: "ready",
    view: {
      isSigningOut: signOut.isPending,
      onBack: () => {
        /*
         * A direct load has no in-app history, so going back would leave the
         * app. Fall back to the workspace index instead of exiting.
         */
        if (location.key === "default") {
          void navigate("/");
          return;
        }

        void navigate(-1);
      },
      onSignOut: () => {
        void signOut.signOut();
      },
      signOutError: signOut.errorMessage,
      user: {
        email: session.user.email,
        image: session.user.image ?? null,
        name: session.user.name,
      },
    },
  };
}

export { useAccountLayout, type AccountLayoutState, type AccountLayoutView };
