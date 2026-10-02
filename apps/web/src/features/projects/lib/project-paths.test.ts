import { expect, test } from "vitest";

import { projectOverviewPath, projectSettingsPath } from "./project-paths";

test("builds the short project base and encodes both slugs", () => {
  expect(projectOverviewPath("acme", "website")).toBe("/w/acme/p/website");
  expect(projectSettingsPath("acme", "website")).toBe("/w/acme/p/website/settings");
  expect(projectOverviewPath("a/b", "c d")).toBe("/w/a%2Fb/p/c%20d");
});
