import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { useAuthSession } from "./use-auth-session";
import { useWorkspaceDestination } from "@/features/workspaces";
import { notify } from "@/shared";

type AuthCompleteState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "unverified" }
  | { status: "redirecting" }
  | { status: "provider-error" }
  | { message: string; status: "error" };

function useAuthComplete(): AuthCompleteState {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const providerError = searchParams.get("error");
  const session = useAuthSession();
  const destination = useWorkspaceDestination();
  const isVerified = session.status === "authenticated" && session.user.emailVerified;
  const destinationPath = destination.status === "ready" ? destination.path : null;
  const hasNotified = useRef(false);

  /*
   * The callback route is the only entry point after a provider redirect, so a
   * single toast here confirms the sign-in without firing again on re-render.
   */
  useEffect(() => {
    if (hasNotified.current) {
      return;
    }

    if (providerError !== null) {
      hasNotified.current = true;
      notify.error("Sign-in could not be completed. Please try again.");
      return;
    }

    if (isVerified && destinationPath !== null) {
      hasNotified.current = true;
      notify.success("Signed in successfully");
    }
  }, [destinationPath, isVerified, providerError]);

  /*
   * A provider error suppresses resolution entirely, so an error screen can
   * never be navigated away from by a stale session.
   */
  useEffect(() => {
    if (providerError !== null || !isVerified || destinationPath === null) {
      return;
    }

    void navigate(destinationPath, { replace: true });
  }, [destinationPath, isVerified, navigate, providerError]);

  if (providerError !== null) {
    return { status: "provider-error" };
  }

  if (session.status === "loading") {
    return { status: "loading" };
  }

  if (session.status === "unauthenticated") {
    return { status: "unauthenticated" };
  }

  if (session.status === "error") {
    return { message: "We could not check your session. Please try again.", status: "error" };
  }

  if (!session.user.emailVerified) {
    return { status: "unverified" };
  }

  if (destination.status === "error") {
    return { message: destination.message, status: "error" };
  }

  return { status: "redirecting" };
}

export { useAuthComplete, type AuthCompleteState };
