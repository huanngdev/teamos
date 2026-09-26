import { Outlet } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/features/auth";
import { useAccountLayout } from "@/layouts/use-account-layout";
import { Logo, ModeToggle, PageLoading } from "@/shared";
import { ArrowLeftIcon } from "@phosphor-icons/react";

/*
 * Account shell for identity-scoped pages. It is intentionally a sibling of the
 * workspace layout: account pages must load without a workspace context.
 */
function AccountLayout() {
  const state = useAccountLayout();

  if (state.status === "loading") {
    return <PageLoading label="Loading your account" />;
  }

  const { view } = state;

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:p-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo size="2rem" variant="wordmark" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ModeToggle />
            <AccountMenu
              isSigningOut={view.isSigningOut}
              onSignOut={view.onSignOut}
              user={view.user}
            />
          </div>
        </header>

        {view.signOutError === null ? null : (
          <Alert variant="destructive">
            <AlertTitle>Sign-out failed</AlertTitle>
            <AlertDescription>{view.signOutError}</AlertDescription>
          </Alert>
        )}

        <nav>
          <Button onClick={view.onBack} variant="ghost">
            <ArrowLeftIcon data-icon="inline-start" />
            Back
          </Button>
        </nav>

        <Outlet />
      </div>
    </main>
  );
}

export { AccountLayout };
