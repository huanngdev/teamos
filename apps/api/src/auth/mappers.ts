import type {
  AuthenticatedSession,
  AuthenticatedUser,
  CurrentUserResponse,
  OrganizationMember,
} from "@teamos/shared";
import { parseOrganizationRole } from "@teamos/shared";

import type { AuthSession, AuthUser } from "./models.js";

function toAuthenticatedUser(user: AuthUser): AuthenticatedUser {
  return {
    email: user.email,
    emailVerified: user.emailVerified,
    id: user.id,
    image: user.image ?? null,
    name: user.name,
  };
}

function toCurrentUserResponse(authSession: AuthSession): CurrentUserResponse {
  const session: AuthenticatedSession = {
    activeOrganizationId: authSession.session.activeOrganizationId ?? null,
    expiresAt: authSession.session.expiresAt.toISOString(),
    id: authSession.session.id,
  };

  return {
    session,
    user: toAuthenticatedUser(authSession.user),
  };
}

interface OrganizationMemberRecord {
  email: string;
  id: string;
  image: string | null;
  name: string;
  role: string;
  userId: string;
}

function toOrganizationMember(record: OrganizationMemberRecord): OrganizationMember {
  return {
    email: record.email,
    id: record.id,
    image: record.image,
    name: record.name,
    role: parseOrganizationRole(record.role) ?? "member",
    userId: record.userId,
  };
}

export { toAuthenticatedUser, toCurrentUserResponse, toOrganizationMember };
