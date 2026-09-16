import { AuthCard } from "@/components/auth-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useVerifyEmail } from "@/hooks/use-verify-email";

function VerifyEmailPage() {
  const verifyEmail = useVerifyEmail();

  return (
    <AuthCard
      description="Enter your email address and we will send a new verification link."
      title="Verify your email"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void verifyEmail.resendVerificationEmail();
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="verify-email">Email address</Label>
          <Input
            autoComplete="email"
            id="verify-email"
            onChange={(event) => {
              verifyEmail.setEmail(event.target.value);
            }}
            placeholder="you@example.com"
            type="email"
            value={verifyEmail.email}
          />
        </div>

        {verifyEmail.status === "sent" ? (
          <Alert>
            <AlertDescription>
              If that address belongs to an account, a verification link is on its way.
            </AlertDescription>
          </Alert>
        ) : null}

        {verifyEmail.errorMessage === null ? null : (
          <Alert variant="destructive">
            <AlertDescription>{verifyEmail.errorMessage}</AlertDescription>
          </Alert>
        )}

        <Button disabled={verifyEmail.status === "sending"} type="submit">
          {verifyEmail.status === "sending" ? <Spinner data-icon="inline-start" /> : null}
          Send verification link
        </Button>
      </form>
    </AuthCard>
  );
}

export { VerifyEmailPage };
