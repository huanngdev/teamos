import { describe, expect, test } from "bun:test";

import {
  canCreateIssueView,
  canManageIssueView,
  canManageListedIssueView,
  canReadIssueView,
  describeIssueViewFilters,
  emptyIssueViewDefinition,
  findStaleIssueViewReferences,
  getIssueViewVisibilityLabel,
  issueViewDefinitionFromFilters,
  issueViewDefinitionsEqual,
  issueViewToListQuery,
  normalizeIssueViewDefinition,
} from "./issue-view.js";
import { parseIssueListQuery } from "./issue-list-query.js";

const statusId = "11111111-1111-4111-8111-111111111111";
const viewer = {
  actorMemberId: "member-viewer",
  canUpdateProject: false,
  canViewProject: true,
};
const lead = {
  actorMemberId: "member-lead",
  canUpdateProject: true,
  canViewProject: true,
};

describe("issue view access", () => {
  test("lets anyone who can see the project save a personal view", () => {
    expect(canCreateIssueView("personal", viewer)).toBe(true);
    expect(canCreateIssueView("project", viewer)).toBe(false);
    expect(canCreateIssueView("project", lead)).toBe(true);
    expect(canCreateIssueView("personal", { ...viewer, canViewProject: false })).toBe(false);
  });

  test("hides another person's personal view even from a project lead", () => {
    expect(
      canReadIssueView({
        ...lead,
        ownerMemberId: "member-viewer",
        visibility: "personal",
      }),
    ).toBe(false);
    expect(
      canManageIssueView({
        ...viewer,
        ownerMemberId: viewer.actorMemberId,
        visibility: "personal",
      }),
    ).toBe(true);
  });

  test("lets project viewers read a shared view but only leads manage it", () => {
    const shared = { ownerMemberId: null, visibility: "project" as const };

    expect(canReadIssueView({ ...viewer, ...shared })).toBe(true);
    expect(canManageIssueView({ ...viewer, ...shared })).toBe(false);
    expect(canManageIssueView({ ...lead, ...shared })).toBe(true);
    expect(canManageListedIssueView("project", viewer)).toBe(false);
    expect(canManageListedIssueView("personal", viewer)).toBe(true);
  });

  test("does not render visibility codes", () => {
    expect(getIssueViewVisibilityLabel("personal")).toBe("Personal");
    expect(getIssueViewVisibilityLabel("project")).toBe("Project");
  });
});

describe("normalizeIssueViewDefinition", () => {
  test("keeps high separate from urgent and resolves me symbolically", () => {
    const definition = normalizeIssueViewDefinition({
      filters: {
        assignee: {
          includeCurrentUser: true,
          includeUnassigned: false,
          memberIds: [],
        },
        priorities: ["high", "high"],
        timeZone: "UTC",
      },
      version: 1,
    });
    const query = issueViewToListQuery(definition);

    expect(query.priority).toBe("high");
    expect(query.assignee).toBe("me");
    expect(definition.filters.priorities).toEqual(["high"]);
  });

  test("combines filters with and and values inside a filter with or", () => {
    const definition = normalizeIssueViewDefinition({
      filters: {
        assignee: {
          includeCurrentUser: false,
          includeUnassigned: true,
          memberIds: ["member-b", "member-a", "member-a"],
        },
        categories: ["started", "unstarted"],
        priorities: ["urgent", "high"],
        timeZone: "Asia/Ho_Chi_Minh",
      },
      version: 1,
    });
    const filters = parseIssueListQuery(issueViewToListQuery(definition));

    expect(filters.assignees).toEqual(["member-a", "member-b"]);
    expect(filters.includeUnassigned).toBe(true);
    expect(filters.includeCurrentUser).toBe(false);
    expect(filters.priorities).toEqual(["high", "urgent"]);
    expect(filters.categories).toEqual(["unstarted", "started"]);
    expect(filters.timeZone).toBe("Asia/Ho_Chi_Minh");
  });

  test("round-trips a saved definition through the issue list query", () => {
    const definition = normalizeIssueViewDefinition({
      filters: {
        createdFrom: "2026-01-01",
        createdTo: "2026-01-31",
        numberMin: 2,
        q: "gate",
        statusIds: [statusId],
        timeZone: "UTC",
        title: "orbit",
      },
      version: 1,
    });
    const restored = issueViewDefinitionFromFilters(
      parseIssueListQuery(issueViewToListQuery(definition)),
    );

    expect(issueViewDefinitionsEqual(definition, restored)).toBe(true);
  });

  test("rejects an inverted range and an impossible date instead of widening the view", () => {
    expect(() =>
      normalizeIssueViewDefinition({
        filters: { numberMax: 1, numberMin: 4, timeZone: "UTC" },
        version: 1,
      }),
    ).toThrow();
    expect(() =>
      normalizeIssueViewDefinition({
        filters: { createdFrom: "2026-02-31", timeZone: "UTC" },
        version: 1,
      }),
    ).toThrow();
    expect(() => emptyIssueViewDefinition("Not/AZone")).toThrow();
  });
});

describe("issue view display", () => {
  test("describes filters with labels and marks missing references", () => {
    const definition = normalizeIssueViewDefinition({
      filters: {
        assignee: {
          includeCurrentUser: true,
          includeUnassigned: false,
          memberIds: ["member-missing"],
        },
        priorities: ["high"],
        statusIds: [statusId],
        timeZone: "UTC",
      },
      version: 1,
    });

    expect(describeIssueViewFilters(definition)).toEqual([
      "Assigned to me",
      "Assigned to Unknown member",
      "High",
      "Unknown status",
    ]);
    expect(findStaleIssueViewReferences(definition, { memberIds: [], statusIds: [] })).toEqual({
      memberIds: ["member-missing"],
      statusIds: [statusId],
    });
    expect(describeIssueViewFilters(emptyIssueViewDefinition("UTC"))).toEqual([]);
  });
});
