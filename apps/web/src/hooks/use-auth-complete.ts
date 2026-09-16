import { useEffect } from "react";
import { useNavigate } from "react-router";

import { useAuthSession } from "./use-auth-session";
import { useOrganizations } from "./use-organizations";

type AuthCompleteState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "unverified" }
  | { status: "redirecting" }
  | { message: string; status: "error" };

function useAuthComplete(): AuthCompleteState {
  const navigate = useNavigate();
  const session = useAuthSession();
  const isVerified = session.status === "authenticated" && session.user.emailVerified;
  const organizations = useOrganizations({ enabled: isVerified });
  const firstOrganizationSlug = organizations.organizations[0]?.slug ?? null;

  useEffect(() => {
    if (!isVerified || organizations.isPending) {
      return;
    }

    void navigate(firstOrganizationSlug === null ? "/new-workspace" : `/${firstOrganizationSlug}`, {
      replace: true,
    });
  }, [firstOrganizationSlug, isVerified, navigate, organizations.isPending]);

  if (session.status === "loading") {
    return { status: "loading" };
  }

  if (session.status === "unauthenticated") {
    return { status: "unauthenticated" };
  }

  if (!session.user.emailVerified) {
    return { status: "unverified" };
  }

  if (organizations.errorMessage !== null) {
    return { message: organizations.errorMessage, status: "error" };
  }

  return { status: "redirecting" };
}

export { useAuthComplete, type AuthCompleteState };
