import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { apiUrl } from "@/shared/api/env";

const normalizedApiUrl = apiUrl.replace(/\/+$/, "") || apiUrl;

const authClient = createAuthClient({
  baseURL: normalizedApiUrl,
  plugins: [organizationClient()],
});

type AuthSession = typeof authClient.$Infer.Session.session;
type AuthUser = typeof authClient.$Infer.Session.user;

export { authClient, type AuthSession, type AuthUser };
