import {
  invitationListResponseSchema,
  invitationResponseSchema,
  memberListResponseSchema,
  type AssignableOrganizationRole,
  type CreateInvitationRequest,
  type MemberListResponse,
  type OrganizationInvitation,
} from "@teamos/shared";

import { requestParsed, requestVoid } from "@/shared/api/api-client";

interface ListMembersOptions {
  limit: number;
  offset: number;
  search: string | undefined;
}

function organizationPath(slug: string, suffix = ""): string {
  return `/api/organizations/${encodeURIComponent(slug)}${suffix}`;
}

async function listOrganizationMembers(
  slug: string,
  options: ListMembersOptions,
): Promise<MemberListResponse> {
  return requestParsed(memberListResponseSchema, {
    method: "GET",
    params: {
      limit: options.limit,
      offset: options.offset,
      ...(options.search === undefined ? {} : { search: options.search }),
    },
    url: organizationPath(slug, "/members"),
  });
}

async function updateOrganizationMemberRole(
  slug: string,
  memberId: string,
  role: AssignableOrganizationRole,
): Promise<void> {
  await requestVoid({
    data: { role },
    method: "PATCH",
    url: organizationPath(slug, `/members/${encodeURIComponent(memberId)}/role`),
  });
}

async function removeOrganizationMember(slug: string, memberId: string): Promise<void> {
  await requestVoid({
    method: "DELETE",
    url: organizationPath(slug, `/members/${encodeURIComponent(memberId)}`),
  });
}

async function listOrganizationInvitations(slug: string): Promise<OrganizationInvitation[]> {
  const response = await requestParsed(invitationListResponseSchema, {
    method: "GET",
    url: organizationPath(slug, "/invitations"),
  });

  return response.invitations;
}

async function createOrganizationInvitation(
  slug: string,
  request: CreateInvitationRequest,
): Promise<OrganizationInvitation> {
  const response = await requestParsed(invitationResponseSchema, {
    data: request,
    method: "POST",
    url: organizationPath(slug, "/invitations"),
  });

  return response.invitation;
}

async function resendOrganizationInvitation(
  slug: string,
  invitationId: string,
): Promise<OrganizationInvitation> {
  const response = await requestParsed(invitationResponseSchema, {
    method: "POST",
    url: organizationPath(slug, `/invitations/${encodeURIComponent(invitationId)}/resend`),
  });

  return response.invitation;
}

async function cancelOrganizationInvitation(slug: string, invitationId: string): Promise<void> {
  await requestVoid({
    method: "DELETE",
    url: organizationPath(slug, `/invitations/${encodeURIComponent(invitationId)}`),
  });
}

export {
  cancelOrganizationInvitation,
  createOrganizationInvitation,
  listOrganizationInvitations,
  listOrganizationMembers,
  removeOrganizationMember,
  resendOrganizationInvitation,
  updateOrganizationMemberRole,
};
