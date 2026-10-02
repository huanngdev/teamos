import { expect, test } from "vitest";

import { projectBoardPath, projectIssuePath, projectIssuesPath } from "./issue-paths";

test("keeps the issue list and the board as siblings under the project", () => {
  expect(projectIssuesPath("acme", "website")).toBe("/w/acme/p/website/issues");
  expect(projectBoardPath("acme", "website")).toBe("/w/acme/p/website/board");
  expect(projectIssuePath("acme", "website", "I-0001")).toBe("/w/acme/p/website/issues/I-0001");
});
