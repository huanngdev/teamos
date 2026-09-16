import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { authClient } from "@/lib/auth-client";
import { ORGANIZATIONS_QUERY_KEY } from "@/hooks/use-organizations";

type InvitationRecord = NonNullable<
  Awaited<ReturnType<typeof authClient.organization.getInvitation>>["data"]
>;

type InvitationState =
  | { status: "loading" }
  | { invitation: InvitationRecord; status: "ready" }
  | { message: string; status: "error" };

function useInvitation(invitationId: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"accept" | "reject" | null>(null);

  const query = useQuery({
    queryFn: async (): Promise<InvitationRecord> => {
      const { data, error } = await authClient.organization.getInvitation({
        query: { id: invitationId },
      });

      if (error || data === null) {
        throw new Error(error?.message ?? "The invitation could not be loaded.");
      }

      return data;
    },
    queryKey: ["invitation", invitationId],
    retry: false,
  });

  const state: InvitationState = query.isPending
    ? { status: "loading" }
    : query.isSuccess
      ? { invitation: query.data, status: "ready" }
      : { message: "This invitation is invalid, expired, or already used.", status: "error" };

  const acceptInvitation = async (): Promise<void> => {
    setActionError(null);
    setPendingAction("accept");

    const { error } = await authClient.organization.acceptInvitation({ invitationId });

    if (error) {
      setActionError(error.message ?? "The invitation could not be accepted.");
      setPendingAction(null);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
    setPendingAction(null);
    void navigate("/", { replace: true });
  };

  const rejectInvitation = async (): Promise<void> => {
    setActionError(null);
    setPendingAction("reject");

    const { error } = await authClient.organization.rejectInvitation({ invitationId });

    if (error) {
      setActionError(error.message ?? "The invitation could not be rejected.");
      setPendingAction(null);
      return;
    }

    setPendingAction(null);
    void navigate("/", { replace: true });
  };

  return { acceptInvitation, actionError, pendingAction, rejectInvitation, state };
}

export { useInvitation, type InvitationState };
