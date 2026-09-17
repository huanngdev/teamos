interface AuthClientErrorShape {
  code: string | undefined;
  message: string | undefined;
}

/*
 * The Better Auth client returns a `BetterFetchError` whose `code` and
 * `message` are not part of its public TypeScript type, so they are read with
 * runtime narrowing instead of an unchecked assertion.
 */
function readAuthClientError(error: unknown): AuthClientErrorShape {
  if (typeof error !== "object" || error === null) {
    return { code: undefined, message: undefined };
  }

  const code = "code" in error ? error.code : undefined;
  const message = "message" in error ? error.message : undefined;

  return {
    code: typeof code === "string" ? code : undefined,
    message: typeof message === "string" ? message : undefined,
  };
}

export { readAuthClientError, type AuthClientErrorShape };
