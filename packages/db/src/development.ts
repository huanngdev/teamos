/*
 * Single source of truth for the local Drizzle Studio endpoint. The package
 * scripts pass these values to the CLI and the API logs the browser URL that
 * Drizzle Kit derives from them.
 */
const drizzleStudioHost = "127.0.0.1";
const drizzleStudioPort = 4983;
const drizzleStudioUrl = "https://local.drizzle.studio";

export { drizzleStudioHost, drizzleStudioPort, drizzleStudioUrl };
