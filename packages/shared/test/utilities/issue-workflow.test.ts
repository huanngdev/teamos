import { describe, expect, test } from "bun:test";

import {
  getIssuePriorityLabel,
  getIssueStatusCategoryLabel,
  issuePrioritySchema,
  issueStatusCategorySchema,
} from "./issue-workflow.js";

describe("issue label mappers", () => {
  test("maps every status category to non-code display copy", () => {
    for (const category of issueStatusCategorySchema.options) {
      expect(getIssueStatusCategoryLabel(category)).not.toBe(category);
    }
  });

  test("maps every priority to non-code display copy", () => {
    for (const priority of issuePrioritySchema.options) {
      expect(getIssuePriorityLabel(priority)).not.toBe(priority);
    }
  });
});
