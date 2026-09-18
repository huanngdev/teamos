import type { OrganizationSummary } from "@teamos/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";

import { authClient } from "@/features/auth";
import {
  listOrganizations,
  writeRecentWorkspaceSlug,
  workspaceProjectsPath,
  ORGANIZATIONS_QUERY_KEY,
} from "@/features/workspaces";
import { notify } from "@/shared";

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
  const session = authClient.useSession();
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

  /*
   * Acceptance opens the invited workspace directly, and remembers it so the
   * next visit lands there as well.
   */
  const openAcceptedWorkspace = async (organizationId: string | undefined): Promise<void> => {
    const userId = session.data?.user.id;

    if (organizationId === undefined || userId === undefined) {
      void navigate("/", { replace: true });
      return;
    }

    const organizations = await queryClient.fetchQuery<OrganizationSummary[]>({
      queryFn: listOrganizations,
      queryKey: ORGANIZATIONS_QUERY_KEY,
    });
    const accepted = organizations.find((organization) => organization.id === organizationId);

    if (accepted === undefined) {
      void navigate("/", { replace: true });
      return;
    }

    writeRecentWorkspaceSlug(userId, accepted.slug);
    void navigate(workspaceProjectsPath(accepted.slug), { replace: true });
  };

  const acceptInvitation = async (): Promise<void> => {
    setActionError(null);
    setPendingAction("accept");

    const { error } = await authClient.organization.acceptInvitation({ invitationId });

    if (error) {
      const message = error.message ?? "The invitation could not be accepted.";
      setActionError(message);
      notify.error(message);
      setPendingAction(null);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
    setPendingAction(null);
    notify.success("Invitation accepted");
    await openAcceptedWorkspace(query.data?.organizationId);
  };

  const rejectInvitation = async (): Promise<void> => {
    setActionError(null);
    setPendingAction("reject");

    const { error } = await authClient.organization.rejectInvitation({ invitationId });

    if (error) {
      const message = error.message ?? "The invitation could not be rejected.";
      setActionError(message);
      notify.error(message);
      setPendingAction(null);
      return;
    }

    setPendingAction(null);
    notify.success("Invitation rejected");
    void navigate("/", { replace: true });
  };

  return { acceptInvitation, actionError, pendingAction, rejectInvitation, state };
}

export { useInvitation, type InvitationState };
