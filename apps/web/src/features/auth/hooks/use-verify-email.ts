import { useState } from "react";

import { authClient } from "../api/auth-client";

type VerificationStatus = "error" | "idle" | "sending" | "sent";

function useVerifyEmail(initialEmail = "") {
  const [email, setEmail] = useState(initialEmail);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<VerificationStatus>("idle");

  const resendVerificationEmail = async (): Promise<void> => {
    const trimmedEmail = email.trim();

    if (trimmedEmail === "") {
      setStatus("error");
      setErrorMessage("Enter the email address you signed in with.");
      return;
    }

    setErrorMessage(null);
    setStatus("sending");

    const { error } = await authClient.sendVerificationEmail({
      callbackURL: `${window.location.origin}/auth/complete`,
      email: trimmedEmail,
    });

    if (error) {
      setErrorMessage(error.message ?? "The verification email could not be sent.");
      setStatus("error");
      return;
    }

    setStatus("sent");
  };

  return { email, errorMessage, resendVerificationEmail, setEmail, status };
}

export { useVerifyEmail, type VerificationStatus };
