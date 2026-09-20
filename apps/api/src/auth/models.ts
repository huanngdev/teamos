import type { Auth } from "./auth.js";

type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
type AuthUser = AuthSession["user"];
type AuthSessionRecord = AuthSession["session"];

export type { AuthSession, AuthSessionRecord, AuthUser };
