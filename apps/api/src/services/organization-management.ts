import type { ILogLayer } from "loglayer";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  assignableOrganizationRoleSchema,
  canAssignOrganizationRole,
  canDeleteOrganization,
  canManageOrganizationMember,
  canUpdateOrganization,
  canViewPendingInvitations,
  parseOrganizationRole,
  type ApiErrorCode,
  type AssignableOrganizationRole,
  type CreateInvitationRequest,
  type DeleteOrganizationRequest,
  type OrganizationInvitation,
  type OrganizationSummary,
  type UpdateOrganizationRequest,
} from "@teamos/shared";

import type {
  InvitationRecord,
  OrganizationAccess,
  OrganizationGateway,
  OrganizationRecord,
} from "@/auth/index.js";
import { AppError } from "@/errors/index.js";
import type { OrganizationMemberService } from "@/services/organization-members.js";

interface OrganizationManagementService {
  cancelInvitation: (input: {
    headers: Headers;
    invitationId: string;
    organization: OrganizationAccess;
  }) => Promise<void>;
  createInvitation: (input: {
    headers: Headers;
    organization: OrganizationAccess;
    request: CreateInvitationRequest;
  }) => Promise<OrganizationInvitation>;
  deleteOrganization: (input: {
    headers: Headers;
    organization: OrganizationAccess;
    request: DeleteOrganizationRequest;
  }) => Promise<void>;
  listPendingInvitations: (input: {
    headers: Headers;
    organization: OrganizationAccess;
  }) => Promise<OrganizationInvitation[]>;
  removeMember: (input: {
    actorUserId: string;
    headers: Headers;
    memberId: string;
    organization: OrganizationAccess;
  }) => Promise<void>;
  resendInvitation: (input: {
    headers: Headers;
    invitationId: string;
    organization: OrganizationAccess;
  }) => Promise<OrganizationInvitation>;
  updateMemberRole: (input: {
    headers: Headers;
    memberId: string;
    organization: OrganizationAccess;
    role: AssignableOrganizationRole;
  }) => Promise<void>;
  updateOrganization: (input: {
    headers: Headers;
    organization: OrganizationAccess;
    request: UpdateOrganizationRequest;
  }) => Promise<OrganizationSummary>;
}

interface OrganizationManagementDependencies {
  gateway: OrganizationGateway;
  logger: ILogLayer;
  members: Pick<OrganizationMemberService, "findMember">;
}

interface BetterAuthErrorInfo {
  code: string | undefined;
  statusCode: number | undefined;
}

interface MappedError {
  code: ApiErrorCode;
  message: string;
  status: ContentfulStatusCode;
}

/*
 * Better Auth error fields are read with runtime narrowing instead of an
 * assertion so an unexpected shape cannot crash the error path.
 */
function readBetterAuthError(error: unknown): BetterAuthErrorInfo {
  if (typeof error !== "object" || error === null) {
    return { code: undefined, statusCode: undefined };
  }

  const body = "body" in error ? error.body : undefined;
  const bodyIsObject = typeof body === "object" && body !== null;
  const code = bodyIsObject && "code" in body ? body.code : undefined;
  const statusCode = "statusCode" in error ? error.statusCode : undefined;

  return {
    code: typeof code === "string" ? code : undefined,
    statusCode: typeof statusCode === "number" ? statusCode : undefined,
  };
}

const betterAuthErrorMapping: Readonly<Record<string, MappedError>> = {
  INVITATION_LIMIT_REACHED: {
    code: "INVITATION_LIMIT_REACHED",
    message: "This workspace has reached its pending invitation limit.",
    status: 409,
  },
  INVITATION_NOT_FOUND: {
    code: "INVITATION_NOT_FOUND",
    message: "The invitation was not found.",
    status: 404,
  },
  MEMBER_NOT_FOUND: {
    code: "MEMBER_NOT_FOUND",
    message: "The member was not found in this workspace.",
    status: 404,
  },
  ORGANIZATION_NOT_FOUND: {
    code: "ORGANIZATION_NOT_FOUND",
    message: "The organization was not found.",
    status: 404,
  },
  USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION: {
    code: "ORGANIZATION_NOT_FOUND",
    message: "The organization was not found.",
    status: 404,
  },
  ORGANIZATION_MEMBERSHIP_LIMIT_REACHED: {
    code: "MEMBER_LIMIT_REACHED",
    message: "This workspace has reached its member limit.",
    status: 409,
  },
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: {
    code: "MEMBER_ALREADY_IN_ORGANIZATION",
    message: "That person is already a member of this workspace.",
    status: 409,
  },
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: {
    code: "INVITATION_ALREADY_PENDING",
    message: "An invitation is already pending for that email address.",
    status: 409,
  },
  YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION: {
    code: "FORBIDDEN",
    message: "You are not allowed to cancel that invitation.",
    status: 403,
  },
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER: {
    code: "FORBIDDEN",
    message: "You are not allowed to remove that member.",
    status: 403,
  },
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_ORGANIZATION: {
    code: "FORBIDDEN",
    message: "You are not allowed to delete this workspace.",
    status: 403,
  },
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION: {
    code: "FORBIDDEN",
    message: "You are not allowed to invite members.",
    status: 403,
  },
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE: {
    code: "FORBIDDEN",
    message: "You are not allowed to grant that role.",
    status: 403,
  },
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER: {
    code: "FORBIDDEN",
    message: "You are not allowed to change that member.",
    status: 403,
  },
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION: {
    code: "FORBIDDEN",
    message: "You are not allowed to update this workspace.",
    status: 403,
  },
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER: {
    code: "CONFLICT",
    message: "A workspace must keep at least one owner.",
    status: 409,
  },
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER: {
    code: "CONFLICT",
    message: "A workspace must keep at least one owner.",
    status: 409,
  },
};

/*
 * Better Auth owns the mutation, so its errors are translated into the TeamOS
 * error contract without echoing provider internals or database details.
 */
function mapManagementError(error: unknown): AppError | undefined {
  const info = readBetterAuthError(error);
  const mapped = info.code === undefined ? undefined : betterAuthErrorMapping[info.code];

  if (mapped !== undefined) {
    return new AppError(mapped.status, mapped.code, mapped.message);
  }

  if (info.statusCode === 403) {
    return new AppError(403, "FORBIDDEN", "You are not allowed to perform this action.");
  }

  if (info.statusCode === 404) {
    return new AppError(404, "NOT_FOUND", "The requested record was not found.");
  }

  return undefined;
}

/*
 * Better Auth persists an invitation before sending its email, so a delivery
 * failure leaves a real pending invitation behind. The caller is told to resend
 * rather than to create a duplicate.
 */
function toInvitationDeliveryError(): AppError {
  return new AppError(
    502,
    "INVITATION_EMAIL_FAILED",
    "The invitation was saved but the email could not be delivered. Try resending it.",
  );
}

function toGatewayError(): AppError {
  return new AppError(
    502,
    "HTTP_ERROR",
    "The authentication service could not complete the request.",
  );
}

function toOrganizationSummary(record: OrganizationRecord): OrganizationSummary {
  return {
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    logo: record.logo,
    name: record.name,
    slug: record.slug,
  };
}

function toOrganizationInvitation(record: InvitationRecord): OrganizationInvitation {
  const status =
    record.status === "pending" || record.status === "accepted" || record.status === "rejected"
      ? record.status
      : "canceled";

  return {
    createdAt: record.createdAt.toISOString(),
    email: record.email,
    expiresAt: record.expiresAt.toISOString(),
    id: record.id,
    inviterId: record.inviterId,
    role: parseOrganizationRole(record.role) ?? "member",
    status,
  };
}

function isActivePendingInvitation(record: InvitationRecord, now: Date): boolean {
  return record.status === "pending" && record.expiresAt.getTime() > now.getTime();
}

function assertCanManageInvitations(organization: OrganizationAccess): void {
  if (!canViewPendingInvitations(organization.role)) {
    throw new AppError(403, "FORBIDDEN", "You are not allowed to manage invitations.");
  }
}

function assertCanUpdateOrganization(organization: OrganizationAccess): void {
  if (!canUpdateOrganization(organization.role)) {
    throw new AppError(403, "FORBIDDEN", "You are not allowed to update this workspace.");
  }
}

function assertCanDeleteOrganization(organization: OrganizationAccess): void {
  if (!canDeleteOrganization(organization.role)) {
    throw new AppError(403, "FORBIDDEN", "You are not allowed to delete this workspace.");
  }
}

function createOrganizationManagementService(
  dependencies: OrganizationManagementDependencies,
): OrganizationManagementService {
  const { gateway, logger, members } = dependencies;

  async function findTargetMember(memberId: string, organizationId: string) {
    const target = await members.findMember({ memberId, organizationId });

    if (target === undefined) {
      throw new AppError(404, "MEMBER_NOT_FOUND", "The member was not found in this workspace.");
    }

    return target;
  }

  /*
   * Resolves an invitation through the organization-scoped list so a caller who
   * administers two organizations cannot act on another tenant's invitation
   * through the wrong URL. It also enforces that only a live pending invitation
   * can be changed, which Better Auth's cancel endpoint does not check.
   */
  async function findActiveInvitation(
    headers: Headers,
    organization: OrganizationAccess,
    invitationId: string,
  ): Promise<InvitationRecord> {
    let records: InvitationRecord[];

    try {
      records = await gateway.listInvitations({
        headers,
        organizationId: organization.organizationId,
      });
    } catch (error) {
      throw mapManagementError(error) ?? toGatewayError();
    }

    const existing = records.find((record) => record.id === invitationId);

    if (existing === undefined) {
      throw new AppError(404, "INVITATION_NOT_FOUND", "The invitation was not found.");
    }

    if (!isActivePendingInvitation(existing, new Date())) {
      throw new AppError(409, "CONFLICT", "That invitation is no longer pending.");
    }

    return existing;
  }

  return {
    cancelInvitation: async ({ headers, invitationId, organization }) => {
      assertCanManageInvitations(organization);

      const existing = await findActiveInvitation(headers, organization, invitationId);

      try {
        await gateway.cancelInvitation({ headers, invitationId: existing.id });
      } catch (error) {
        throw mapManagementError(error) ?? toGatewayError();
      }

      logger
        .withMetadata({
          actorMemberId: organization.memberId,
          invitationId: existing.id,
          organizationId: organization.organizationId,
        })
        .info("organization.invitation.cancelled");
    },
    createInvitation: async ({ headers, organization, request }) => {
      if (!canAssignOrganizationRole(organization.role, request.role)) {
        throw new AppError(403, "FORBIDDEN", "You are not allowed to grant that role.");
      }

      let invitation: InvitationRecord;

      try {
        invitation = await gateway.createInvitation({
          email: request.email,
          headers,
          organizationId: organization.organizationId,
          role: request.role,
        });
      } catch (error) {
        throw mapManagementError(error) ?? toInvitationDeliveryError();
      }

      logger
        .withMetadata({
          actorMemberId: organization.memberId,
          invitationId: invitation.id,
          organizationId: organization.organizationId,
          role: request.role,
        })
        .info("organization.invitation.created");

      return toOrganizationInvitation(invitation);
    },
    deleteOrganization: async ({ headers, organization, request }) => {
      assertCanDeleteOrganization(organization);

      /*
       * The typed confirmation is checked against the stored name so a stale tab
       * cannot delete a workspace that was renamed since the dialog opened.
       */
      if (request.confirmationName !== organization.name) {
        throw new AppError(
          422,
          "VALIDATION_ERROR",
          "Type the workspace name exactly to confirm deletion.",
        );
      }

      try {
        await gateway.deleteOrganization({ headers, organizationId: organization.organizationId });
      } catch (error) {
        throw mapManagementError(error) ?? toGatewayError();
      }

      logger
        .withMetadata({
          actorMemberId: organization.memberId,
          organizationId: organization.organizationId,
          organizationName: organization.name,
        })
        .info("organization.deleted");
    },
    listPendingInvitations: async ({ headers, organization }) => {
      assertCanManageInvitations(organization);

      let records: InvitationRecord[];

      try {
        records = await gateway.listInvitations({
          headers,
          organizationId: organization.organizationId,
        });
      } catch (error) {
        throw mapManagementError(error) ?? toGatewayError();
      }

      const now = new Date();

      return records
        .filter((record) => isActivePendingInvitation(record, now))
        .map(toOrganizationInvitation)
        .sort((left, right) => left.expiresAt.localeCompare(right.expiresAt));
    },
    removeMember: async ({ actorUserId, headers, memberId, organization }) => {
      const target = await findTargetMember(memberId, organization.organizationId);

      if (!canManageOrganizationMember(organization.role, target.role)) {
        throw new AppError(403, "FORBIDDEN", "You are not allowed to remove that member.");
      }

      /*
       * Leaving a workspace is a separate flow with its own confirmation, so a
       * row action can never remove the acting user by accident.
       */
      if (target.userId === actorUserId) {
        throw new AppError(400, "CONFLICT", "You cannot remove yourself from a row action.");
      }

      try {
        await gateway.removeMember({
          headers,
          memberIdOrEmail: memberId,
          organizationId: organization.organizationId,
        });
      } catch (error) {
        throw mapManagementError(error) ?? toGatewayError();
      }

      logger
        .withMetadata({
          actorMemberId: organization.memberId,
          organizationId: organization.organizationId,
          targetMemberId: memberId,
        })
        .info("organization.member.removed");
    },
    resendInvitation: async ({ headers, invitationId, organization }) => {
      assertCanManageInvitations(organization);

      const existing = await findActiveInvitation(headers, organization, invitationId);

      const role = assignableOrganizationRoleSchema.safeParse(parseOrganizationRole(existing.role));

      if (!role.success) {
        throw new AppError(
          409,
          "CONFLICT",
          "Cancel this invitation and create a new one with a supported role.",
        );
      }

      /*
       * Creating a new invitation (instead of `resend: true`) cancels the
       * previous pending record, so the previously emailed link stops working.
       */
      let invitation: InvitationRecord;

      try {
        invitation = await gateway.createInvitation({
          email: existing.email,
          headers,
          organizationId: organization.organizationId,
          role: role.data,
        });
      } catch (error) {
        throw mapManagementError(error) ?? toInvitationDeliveryError();
      }

      logger
        .withMetadata({
          actorMemberId: organization.memberId,
          invitationId: invitation.id,
          organizationId: organization.organizationId,
          previousInvitationId: existing.id,
        })
        .info("organization.invitation.resent");

      return toOrganizationInvitation(invitation);
    },
    updateMemberRole: async ({ headers, memberId, organization, role }) => {
      const target = await findTargetMember(memberId, organization.organizationId);

      if (
        !canManageOrganizationMember(organization.role, target.role) ||
        !canAssignOrganizationRole(organization.role, role)
      ) {
        throw new AppError(403, "FORBIDDEN", "You are not allowed to change that member's role.");
      }

      try {
        await gateway.updateMemberRole({
          headers,
          memberId,
          organizationId: organization.organizationId,
          role,
        });
      } catch (error) {
        throw mapManagementError(error) ?? toGatewayError();
      }

      logger
        .withMetadata({
          actorMemberId: organization.memberId,
          organizationId: organization.organizationId,
          role,
          targetMemberId: memberId,
        })
        .info("organization.member.role_updated");
    },
    updateOrganization: async ({ headers, organization, request }) => {
      assertCanUpdateOrganization(organization);

      let updated: OrganizationRecord;

      try {
        updated = await gateway.updateOrganization({
          headers,
          name: request.name,
          organizationId: organization.organizationId,
        });
      } catch (error) {
        throw mapManagementError(error) ?? toGatewayError();
      }

      logger
        .withMetadata({
          actorMemberId: organization.memberId,
          organizationId: organization.organizationId,
        })
        .info("organization.updated");

      return toOrganizationSummary(updated);
    },
  };
}

export {
  createOrganizationManagementService,
  mapManagementError,
  readBetterAuthError,
  toOrganizationInvitation,
  type OrganizationManagementService,
};
