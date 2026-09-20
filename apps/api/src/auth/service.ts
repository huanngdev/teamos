import type { Auth } from "./auth.js";
import type { AuthSession } from "./models.js";

interface AuthService {
  getSession: (headers: Headers) => Promise<AuthSession | null>;
  handler: (request: Request) => Promise<Response>;
}

function createAuthService(auth: Auth): AuthService {
  return {
    getSession: (headers) => auth.api.getSession({ headers }),
    handler: (request) => auth.handler(request),
  };
}

export { createAuthService, type AuthService };
