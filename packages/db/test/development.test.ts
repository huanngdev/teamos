import { expect, test } from "vitest";

import { drizzleStudioHost, drizzleStudioPort } from "../src/development.js";

test("drizzle studio scripts bind the documented development endpoint", async () => {
  const manifest = (await Bun.file(new URL("../package.json", import.meta.url)).json()) as {
    scripts: Record<string, string>;
  };

  const script = manifest.scripts["db:studio"] ?? "";

  expect(script).toContain(`--host ${drizzleStudioHost}`);
  expect(script).toContain(`--port ${drizzleStudioPort}`);
});
