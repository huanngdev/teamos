import { z } from "zod";

import {
  assignableOrganizationRoleSchema,
  organizationRoleSchema,
} from "../utilities/organization-roles.js";

const invitationStatusSchema = z.enum(["pending", "accepted", "rejected", "canceled"]);

/*
 * The role is displayed as stored. New invitations can only request an
 * assignable role, but a historical row is still reported truthfully rather
 * than silently rewritten.
 */
const organizationInvitationSchema = z.object({
  createdAt: z.iso.datetime(),
  email: z.email(),
  expiresAt: z.iso.datetime(),
  id: z.string().min(1),
  inviterId: z.string().min(1),
  role: organizationRoleSchema,
  status: invitationStatusSchema,
});

const createInvitationRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  role: assignableOrganizationRoleSchema.default("member"),
});

const invitationListResponseSchema = z.object({
  invitations: z.array(organizationInvitationSchema),
});

const invitationResponseSchema = z.object({
  invitation: organizationInvitationSchema,
});

type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;
type InvitationListResponse = z.infer<typeof invitationListResponseSchema>;
type InvitationResponse = z.infer<typeof invitationResponseSchema>;
type InvitationStatus = z.infer<typeof invitationStatusSchema>;
type OrganizationInvitation = z.infer<typeof organizationInvitationSchema>;

export {
  createInvitationRequestSchema,
  invitationListResponseSchema,
  invitationResponseSchema,
  invitationStatusSchema,
  organizationInvitationSchema,
  type CreateInvitationRequest,
  type InvitationListResponse,
  type InvitationResponse,
  type InvitationStatus,
  type OrganizationInvitation,
};
