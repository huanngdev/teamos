import type { Auth } from "./auth.js";
import type { AuthUser } from "./models.js";

interface UserGateway {
  /*
   * `updateUser` persists the change and the follow-up `getSession` returns the
   * refreshed user plus Better Auth's response headers. Forwarding those headers
   * keeps the session cookie in sync even if cookie caching is enabled later.
   */
  updateUser: (input: {
    headers: Headers;
    name: string;
  }) => Promise<{ headers: Headers; user: AuthUser }>;
}

function createUserGateway(auth: Auth): UserGateway {
  return {
    updateUser: async ({ headers, name }) => {
      await auth.api.updateUser({ body: { name }, headers });

      const refreshed = await auth.api.getSession({ headers, returnHeaders: true });

      if (refreshed.response === null) {
        throw new Error("Better Auth returned no session after updating the user.");
      }

      return { headers: refreshed.headers, user: refreshed.response.user };
    },
  };
}

export { createUserGateway, type UserGateway };
