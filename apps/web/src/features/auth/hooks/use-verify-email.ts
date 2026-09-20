import { useState } from "react";

import { notify } from "@/shared";
import { authClient } from "../api/auth-client";

type VerificationStatus = "error" | "idle" | "sending" | "sent";

interface UseVerifyEmailOptions {
  callbackPath?: string;
  initialEmail?: string;
}

function useVerifyEmail(options: UseVerifyEmailOptions = {}) {
  const [email, setEmail] = useState(options.initialEmail ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const callbackPath = options.callbackPath ?? "/auth/complete";

  const resendVerificationEmail = async (): Promise<void> => {
    const trimmedEmail = email.trim();

    if (trimmedEmail === "") {
      setStatus("error");
      setErrorMessage("Enter the email address you signed in with.");
      notify.error("Enter the email address you signed in with.");
      return;
    }

    setErrorMessage(null);
    setStatus("sending");

    try {
      const { error } = await authClient.sendVerificationEmail({
        callbackURL: `${window.location.origin}${callbackPath}`,
        email: trimmedEmail,
      });

      if (error) {
        const message = error.message ?? "The verification email could not be sent.";
        setErrorMessage(message);
        notify.error(message);
        setStatus("error");
        return;
      }

      setStatus("sent");
      notify.success("Check your inbox for the verification link");
    } catch {
      const message = "The verification email could not be sent.";
      setErrorMessage(message);
      notify.error(message);
      setStatus("error");
    }
  };

  return { email, errorMessage, resendVerificationEmail, setEmail, status };
}

export { useVerifyEmail, type VerificationStatus };
