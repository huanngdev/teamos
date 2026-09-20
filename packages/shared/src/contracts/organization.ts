import { z } from "zod";

import { organizationRoleSchema } from "../utilities/organization-roles.js";

const organizationSlugSchema = z
  .string()
  .min(1)
  .max(48)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain lowercase letters, numbers, and hyphens.",
  );

/*
 * `createdAt` makes workspace ordering deterministic. Better Auth does not
 * guarantee a row order for its organization list, so the client derives the
 * newest workspace from this field instead of array position.
 */
const organizationSummarySchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.string().min(1),
  logo: z.string().nullable(),
  name: z.string().min(1),
  slug: organizationSlugSchema,
});

const organizationMemberSchema = z.object({
  email: z.email(),
  id: z.string().min(1),
  image: z.string().nullable(),
  name: z.string(),
  role: organizationRoleSchema,
  userId: z.string().min(1),
});

/*
 * Members are not embedded in the workspace context. The count supports the tab
 * badge and the list is loaded separately with search and pagination so a large
 * organization never pays for every member on workspace bootstrap.
 */
const organizationContextSchema = organizationSummarySchema.extend({
  memberCount: z.number().int().min(0),
  role: organizationRoleSchema,
});

const organizationContextResponseSchema = z.object({
  organization: organizationContextSchema,
});

/*
 * Renaming only changes the display name; the slug and URL stay stable. The
 * limit matches project names so workspace and project copy behave the same.
 */
const organizationNameSchema = z.string().trim().min(1).max(80);

const updateOrganizationRequestSchema = z.object({
  name: organizationNameSchema,
});

/*
 * Deletion echoes the workspace name so the server can confirm the caller meant
 * this exact workspace, not one that was renamed or switched in another tab.
 */
const deleteOrganizationRequestSchema = z.object({
  confirmationName: z.string().min(1).max(200),
});

type OrganizationContext = z.infer<typeof organizationContextSchema>;
type OrganizationContextResponse = z.infer<typeof organizationContextResponseSchema>;
type OrganizationMember = z.infer<typeof organizationMemberSchema>;
type OrganizationSlug = z.infer<typeof organizationSlugSchema>;
type OrganizationSummary = z.infer<typeof organizationSummarySchema>;
type UpdateOrganizationRequest = z.infer<typeof updateOrganizationRequestSchema>;
type DeleteOrganizationRequest = z.infer<typeof deleteOrganizationRequestSchema>;

export {
  deleteOrganizationRequestSchema,
  organizationContextResponseSchema,
  organizationContextSchema,
  organizationMemberSchema,
  organizationNameSchema,
  organizationSlugSchema,
  organizationSummarySchema,
  updateOrganizationRequestSchema,
  type DeleteOrganizationRequest,
  type OrganizationContext,
  type OrganizationContextResponse,
  type OrganizationMember,
  type OrganizationSlug,
  type OrganizationSummary,
  type UpdateOrganizationRequest,
};
