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

const organizationSummarySchema = z.object({
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

const organizationContextSchema = organizationSummarySchema.extend({
  members: z.array(organizationMemberSchema),
  role: organizationRoleSchema,
});

const organizationContextResponseSchema = z.object({
  organization: organizationContextSchema,
});

type OrganizationContext = z.infer<typeof organizationContextSchema>;
type OrganizationContextResponse = z.infer<typeof organizationContextResponseSchema>;
type OrganizationMember = z.infer<typeof organizationMemberSchema>;
type OrganizationSlug = z.infer<typeof organizationSlugSchema>;
type OrganizationSummary = z.infer<typeof organizationSummarySchema>;

export {
  organizationContextResponseSchema,
  organizationContextSchema,
  organizationMemberSchema,
  organizationSlugSchema,
  organizationSummarySchema,
  type OrganizationContext,
  type OrganizationContextResponse,
  type OrganizationMember,
  type OrganizationSlug,
  type OrganizationSummary,
};
