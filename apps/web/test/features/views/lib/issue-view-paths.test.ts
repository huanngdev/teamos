import { expect, test } from "vitest";

import { projectViewPath, projectViewsPath } from "./issue-view-paths";

test("builds short saved-view paths and encodes the view id", () => {
  expect(projectViewsPath("acme", "website")).toBe("/w/acme/p/website/views");
  expect(projectViewPath("acme", "website", "view/1")).toBe("/w/acme/p/website/views/view%2F1");
});
