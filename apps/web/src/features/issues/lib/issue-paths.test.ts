import { expect, test } from "vitest";

import { projectBoardPath, projectIssuesPath } from "./issue-paths";

test("keeps the issue list and the board as siblings under the project", () => {
  expect(projectIssuesPath("acme", "website")).toBe("/w/acme/p/website/issues");
  expect(projectBoardPath("acme", "website")).toBe("/w/acme/p/website/board");
});
