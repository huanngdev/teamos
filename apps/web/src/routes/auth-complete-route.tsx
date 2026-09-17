import { Link, Navigate, useSearchParams } from "react-router";

import { AuthCard } from "@/features/auth/components/auth-card";
import { PageLoading } from "@/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { useAuthComplete } from "@/features/auth/hooks/use-auth-complete";

function AuthCompleteRoute() {
  const [searchParams] = useSearchParams();
  const state = useAuthComplete();
  const error = searchParams.get("error");

  if (error === "email_not_verified") {
    return (
      <AuthCard
        description="Confirm your email address before opening your workspace."
        title="Verify your email"
      >
        <div className="flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertTitle>Email verification required</AlertTitle>
            <AlertDescription>
              Your provider reported this email as unverified. Request a new verification link to
              continue.
            </AlertDescription>
          </Alert>
          <Link
            className={buttonVariants({ className: "w-full", variant: "outline" })}
            to="/auth/verify-email"
          >
            Resend verification email
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (error !== null) {
    return (
      <AuthCard description="The sign-in attempt could not be completed." title="Sign-in failed">
        <div className="flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertDescription>
              The provider returned an error. Try signing in again.
            </AlertDescription>
          </Alert>
          <Link className={buttonVariants({ className: "w-full", variant: "outline" })} to="/login">
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (state.status === "unauthenticated") {
    return <Navigate replace to="/login" />;
  }

  if (state.status === "unverified") {
    return <Navigate replace to="/auth/verify-email" />;
  }

  if (state.status === "error") {
    return (
      <AuthCard
        description="Your account is ready, but the workspace list failed to load."
        title="Almost there"
      >
        <div className="flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
          <Link className={buttonVariants({ className: "w-full" })} to="/">
            Try again
          </Link>
        </div>
      </AuthCard>
    );
  }

  return <PageLoading label="Preparing your workspace" />;
}

export { AuthCompleteRoute };
