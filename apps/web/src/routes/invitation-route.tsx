import { getOrganizationRoleLabel, parseOrganizationRole } from "@teamos/shared";
import { Link, Navigate, useParams, useSearchParams } from "react-router";

import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthProviderButtons } from "@/features/auth/components/auth-provider-buttons";
import { PageError, PageLoading } from "@/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuthSession } from "@/features/auth";
import { buildVerifyEmailPath, readSafeRedirectPath } from "@/features/auth/lib/safe-redirect";
import { useInvitation } from "@/features/members/hooks/use-invitation";
import { useSocialProviders } from "@/features/auth/hooks/use-social-providers";
import { useSocialSignIn } from "@/features/auth/hooks/use-social-sign-in";

interface InvitationViewProps {
  invitationId: string;
}

function InvitationView({ invitationId }: InvitationViewProps) {
  const [searchParams] = useSearchParams();
  const session = useAuthSession();
  const providers = useSocialProviders();
  const socialSignIn = useSocialSignIn();
  const invitation = useInvitation(invitationId);
  const invitationPath = `/invitations/${invitationId}`;
  const verifyEmailPath = buildVerifyEmailPath(readSafeRedirectPath(invitationPath));
  const providerError = searchParams.get("error");

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

  if (session.status === "unauthenticated") {
    return (
      <AuthCard
        description="Sign in with the email address that received the invitation."
        title="Sign in to continue"
      >
        <div className="flex flex-col gap-4">
          {providerError === "email_not_verified" ? (
            <Alert variant="destructive">
              <AlertTitle>Verify your email first</AlertTitle>
              <AlertDescription>
                Your provider reported this email as unverified. Verify it, then return to this
                invitation.
              </AlertDescription>
            </Alert>
          ) : null}
          {providerError === null || providerError === "email_not_verified" ? null : (
            <Alert variant="destructive">
              <AlertDescription>
                Sign-in could not be completed. Try again to continue with your invitation.
              </AlertDescription>
            </Alert>
          )}
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
                void socialSignIn.signIn(provider, invitationPath);
              }}
              pendingProvider={socialSignIn.pendingProvider}
              providers={providers.providers}
            />
          )}
          {providerError === "email_not_verified" ? (
            <Link className={buttonVariants({ variant: "outline" })} to={verifyEmailPath}>
              Resend verification email
            </Link>
          ) : null}
        </div>
      </AuthCard>
    );
  }

  /*
   * An unverified session still needs to reach the invitation afterwards, so
   * the invitation path travels with the verification link.
   */
  if (!session.user.emailVerified) {
    return <Navigate replace to={verifyEmailPath} />;
  }

  if (invitation.state.status === "loading") {
    return <PageLoading label="Loading invitation" />;
  }

  if (invitation.state.status === "error") {
    return (
      <AuthCard description={invitation.state.message} title="Invitation unavailable">
        <Link className={buttonVariants({ className: "w-full", variant: "outline" })} to="/">
          Go to your workspace
        </Link>
      </AuthCard>
    );
  }

  const record = invitation.state.invitation;
  const role = parseOrganizationRole(record.role ?? "member") ?? "member";

  return (
    <AuthCard
      description="Review the invitation before it is added to your account."
      title="Organization invitation"
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border px-3 py-2 text-sm">
          <p className="font-medium">{record.organizationName ?? "Organization"}</p>
          <p className="text-muted-foreground">{record.email}</p>
          <p className="text-muted-foreground">Role: {getOrganizationRoleLabel(role)}</p>
        </div>

        {invitation.actionError === null ? null : (
          <Alert variant="destructive">
            <AlertTitle>Action failed</AlertTitle>
            <AlertDescription>{invitation.actionError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={invitation.pendingAction !== null}
            onClick={() => {
              void invitation.acceptInvitation();
            }}
          >
            {invitation.pendingAction === "accept" ? <Spinner data-icon="inline-start" /> : null}
            Accept
          </Button>
          <Button
            className="flex-1"
            disabled={invitation.pendingAction !== null}
            onClick={() => {
              void invitation.rejectInvitation();
            }}
            variant="outline"
          >
            {invitation.pendingAction === "reject" ? <Spinner data-icon="inline-start" /> : null}
            Reject
          </Button>
        </div>
      </div>
    </AuthCard>
  );
}

function InvitationRoute() {
  const { invitationId } = useParams();

  if (invitationId === undefined) {
    return <Navigate replace to="/" />;
  }

  return <InvitationView invitationId={invitationId} />;
}

export { InvitationRoute };
