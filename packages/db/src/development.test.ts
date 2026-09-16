import { expect, test } from "bun:test";

import { drizzleStudioHost, drizzleStudioPort } from "./development.js";

test("drizzle studio scripts bind the documented development endpoint", async () => {
  const manifest = (await Bun.file(new URL("../package.json", import.meta.url)).json()) as {
    scripts: Record<string, string>;
  };

  for (const scriptName of ["dev", "db:studio"]) {
    const script = manifest.scripts[scriptName] ?? "";

    expect(script).toContain(`--host ${drizzleStudioHost}`);
    expect(script).toContain(`--port ${drizzleStudioPort}`);
  }
});
