import type { AuthenticatedUser } from "@teamos/shared";

import { useAuthSession } from "@/features/auth";
import { ProfilePanel } from "@/features/auth/components/profile-panel";
import { useProfileForm } from "@/features/auth/hooks/use-profile-form";

/*
 * The account layout owns session loading, so this route only renders once the
 * user is confirmed. Keying on the user id resets the draft if a different user
 * signs in without a full reload.
 */
function ProfileContent({ user }: { user: AuthenticatedUser }) {
  const view = useProfileForm(user);

  return <ProfilePanel view={view} />;
}

function ProfileRoute() {
  const session = useAuthSession();

  if (session.status !== "authenticated") {
    return null;
  }

  return <ProfileContent key={session.user.id} user={session.user} />;
}

export { ProfileRoute };
