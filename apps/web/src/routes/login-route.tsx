import { Navigate, useSearchParams } from "react-router";

import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthProviderButtons } from "@/features/auth/components/auth-provider-buttons";
import { readSafeRedirectPath } from "@/features/auth/lib/safe-redirect";
import { PageError, PageLoading } from "@/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuthSession } from "@/features/auth";
import { useSocialProviders } from "@/features/auth/hooks/use-social-providers";
import { useSocialSignIn } from "@/features/auth/hooks/use-social-sign-in";

const defaultDestination = "/auth/complete";

function LoginRoute() {
  const [searchParams] = useSearchParams();
  const session = useAuthSession();
  const providers = useSocialProviders();
  const socialSignIn = useSocialSignIn();

  const requested = readSafeRedirectPath(searchParams.get("next"), defaultDestination);
  /* `/login` would loop; anything else under auth uses the completion route. */
  const destination =
    requested.startsWith("/login") || requested.startsWith("/auth/")
      ? defaultDestination
      : requested;

  if (session.status === "loading") {
    return <PageLoading label="Loading your session" />;
  }

  if (session.status === "error") {
    return (
      <PageError
        description="We could not check your session. This is usually temporary."
        onRetry={session.retry}
        title="Connection problem"
      />
    );
  }

  if (session.status === "authenticated") {
    return <Navigate replace to={destination} />;
  }

  return (
    <AuthCard
      description="Use your Google or GitHub account to continue."
      title="Sign in to TeamOS"
    >
      <div className="flex flex-col gap-4">
        {socialSignIn.errorMessage === null ? null : (
          <Alert variant="destructive">
            <AlertDescription>{socialSignIn.errorMessage}</AlertDescription>
          </Alert>
        )}
        {providers.errorMessage === null ? null : (
          <Alert variant="destructive">
            <AlertDescription>{providers.errorMessage}</AlertDescription>
          </Alert>
        )}
        {providers.isPending ? (
          <div className="flex justify-center">
            <Spinner aria-label="Loading sign-in options" />
          </div>
        ) : (
          <AuthProviderButtons
            onSelect={(provider) => {
              void socialSignIn.signIn(provider, destination);
            }}
            pendingProvider={socialSignIn.pendingProvider}
            providers={providers.providers}
          />
        )}
      </div>
    </AuthCard>
  );
}

export { LoginRoute };
