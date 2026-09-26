import { z } from "zod";

const socialProviderIdSchema = z.enum(["google", "github"]);

const socialProviderSchema = z.object({
  enabled: z.boolean(),
  id: socialProviderIdSchema,
  name: z.string().min(1),
});

const socialProvidersResponseSchema = z.object({
  providers: z.array(socialProviderSchema),
});

const authenticatedUserSchema = z.object({
  email: z.email(),
  emailVerified: z.boolean(),
  id: z.string().min(1),
  image: z.string().nullable(),
  name: z.string(),
});

const authenticatedSessionSchema = z.object({
  activeOrganizationId: z.string().min(1).nullable(),
  expiresAt: z.iso.datetime(),
  id: z.string().min(1),
});

const currentUserResponseSchema = z.object({
  session: authenticatedSessionSchema,
  user: authenticatedUserSchema,
});

/*
 * Profile editing only accepts a display name. Email, avatar, and verification
 * state each need their own verified flow, so unknown fields are rejected rather
 * than silently ignored. The limit matches workspace and project names.
 */
const profileNameSchema = z.string().trim().min(1).max(80);

const updateCurrentUserRequestSchema = z.strictObject({
  name: profileNameSchema,
});

type AuthenticatedSession = z.infer<typeof authenticatedSessionSchema>;
type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>;
type SocialProvider = z.infer<typeof socialProviderSchema>;
type SocialProviderId = z.infer<typeof socialProviderIdSchema>;
type SocialProvidersResponse = z.infer<typeof socialProvidersResponseSchema>;
type UpdateCurrentUserRequest = z.infer<typeof updateCurrentUserRequestSchema>;

export {
  authenticatedSessionSchema,
  authenticatedUserSchema,
  currentUserResponseSchema,
  profileNameSchema,
  socialProviderIdSchema,
  socialProviderSchema,
  socialProvidersResponseSchema,
  updateCurrentUserRequestSchema,
  type AuthenticatedSession,
  type AuthenticatedUser,
  type CurrentUserResponse,
  type SocialProvider,
  type SocialProviderId,
  type SocialProvidersResponse,
  type UpdateCurrentUserRequest,
};
