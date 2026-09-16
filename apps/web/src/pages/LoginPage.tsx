import { Navigate } from "react-router";

import { AuthCard } from "@/components/auth-card";
import { AuthProviderButtons } from "@/components/auth-provider-buttons";
import { PageLoading } from "@/components/page-loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useSocialProviders } from "@/hooks/use-social-providers";
import { useSocialSignIn } from "@/hooks/use-social-sign-in";

function LoginPage() {
  const session = useAuthSession();
  const providers = useSocialProviders();
  const socialSignIn = useSocialSignIn();

  if (session.status === "loading") {
    return <PageLoading label="Loading your session" />;
  }

  if (session.status === "authenticated") {
    return <Navigate replace to="/" />;
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
            onSelect={socialSignIn.signIn}
            pendingProvider={socialSignIn.pendingProvider}
            providers={providers.providers}
          />
        )}
      </div>
    </AuthCard>
  );
}

export { LoginPage };
