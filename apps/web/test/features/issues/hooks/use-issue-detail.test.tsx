import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { IssueContentDocument, IssueDetail } from "@teamos/shared";
import { http, HttpResponse } from "msw";
import { useState } from "react";
import { Route, Routes } from "react-router";
import { beforeEach, expect, test } from "vitest";

import { apiUrl } from "@/shared";
import { renderWithProviders } from "@/test/render-app";
import { server } from "@/test/server";
import { boardStatuses, projectResponse, useWorkspaceHandlers } from "@/test/workspace-fixtures";

import { useIssueDetail } from "./use-issue-detail";

const projectId = projectResponse.projects[0].id;
const statusId = boardStatuses.statuses[0].id;
const issueId = "issue-1";
const initialUpdatedAt = "2026-01-02T00:00:00.000Z";

function text(value: string) {
  return {
    detail: 0,
    format: 0,
    mode: "normal" as const,
    style: "" as const,
    text: value,
    type: "text" as const,
    version: 1 as const,
  };
}

function paragraph(value: string) {
  return {
    children: value.length === 0 ? [] : [text(value)],
    direction: null,
    format: "" as const,
    indent: 0,
    type: "paragraph" as const,
    version: 1 as const,
  };
}

function documentWith(lines: readonly string[]): IssueContentDocument {
  return {
    root: {
      children: lines.map((line) => paragraph(line)),
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
    version: 1,
  };
}

const notes = documentWith(["Notes"]);
const blankLines = documentWith(["Hello", "", "", "World", ""]);
const laterEdit = documentWith(["Hello", "", "", "World", "", "Again"]);
const emptyEnter = documentWith(["", ""]);

function issueFixture(
  content: IssueContentDocument | null,
  updatedAt = initialUpdatedAt,
): IssueDetail {
  return {
    assignees: [],
    content,
    contentText: content === null ? "" : "Notes",
    createdAt: initialUpdatedAt,
    id: issueId,
    number: "1",
    position: 0,
    priority: "none",
    statusId,
    title: "Gate",
    updatedAt,
  };
}

interface IssueServer {
  holdFirst: boolean;
  lag: boolean;
  mode: "conflict" | "error" | "ok" | "strip";
  release: (() => void) | null;
  snapshot: IssueDetail;
  stored: IssueDetail;
}

function installIssueServer(issueServer: IssueServer, patches: unknown[]) {
  let clock = Date.parse(initialUpdatedAt);

  server.use(
    http.get(`${apiUrl}/api/organizations/acme/projects/${projectId}/issues/by-number/1`, () =>
      HttpResponse.json({ issue: issueServer.lag ? issueServer.snapshot : issueServer.stored }),
    ),
    http.patch(
      `${apiUrl}/api/organizations/acme/projects/${projectId}/issues/${issueId}`,
      async ({ request }) => {
        const body = (await request.json()) as {
          content?: IssueContentDocument | null;
          priority?: IssueDetail["priority"];
          statusId?: string;
          title?: string;
        };

        patches.push(body);

        if (issueServer.holdFirst && patches.length === 1) {
          await new Promise<void>((resolve) => {
            issueServer.release = resolve;
          });
        }

        if (issueServer.mode === "error") {
          return HttpResponse.json(
            {
              error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "The issue could not be saved.",
                requestId: "req-error",
              },
            },
            { status: 500 },
          );
        }

        if (issueServer.mode === "conflict") {
          return HttpResponse.json(
            {
              error: {
                code: "ISSUE_REVISION_CONFLICT",
                message: "The issue changed. Refresh and try again.",
                requestId: "req-conflict",
              },
            },
            { status: 409 },
          );
        }

        clock += 1000;
        const saved = issueFixture(
          issueServer.mode === "strip" ? issueServer.snapshot.content : (body.content ?? null),
          new Date(clock).toISOString(),
        );
        saved.title = body.title ?? saved.title;
        saved.priority = body.priority ?? saved.priority;
        saved.statusId = body.statusId ?? saved.statusId;

        if (!issueServer.lag) {
          issueServer.stored = saved;
        }

        return HttpResponse.json({ issue: saved });
      },
    ),
  );
}

function DetailHarness() {
  const detail = useIssueDetail();
  const [copy, setCopy] = useState(0);

  if (detail.status !== "ready") {
    return <p>{detail.status}</p>;
  }

  const { view } = detail;

  return (
    <div>
      <p data-testid="generation">{view.editorGeneration}</p>
      <p data-testid="paragraphs">{view.content?.root.children.length ?? 0}</p>
      <p data-testid="save">{view.saveLabel ?? ""}</p>
      <p data-testid="dirty">{view.isDirty ? "dirty" : "clean"}</p>
      <p data-testid="copy">{copy}</p>
      <button
        onClick={() => {
          view.onContent(blankLines, null);
        }}
        type="button"
      >
        Add blank lines
      </button>
      <button
        onClick={() => {
          view.onContent(laterEdit, null);
        }}
        type="button"
      >
        Type again
      </button>
      <button
        onClick={() => {
          view.onContent(emptyEnter, null);
        }}
        type="button"
      >
        Enter on empty
      </button>
      <button
        onClick={() => {
          view.onContent(view.content === null ? null : structuredClone(view.content), null);
          setCopy((current) => current + 1);
        }}
        type="button"
      >
        Move caret
      </button>
    </div>
  );
}

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route
        element={<DetailHarness />}
        path="/w/:organizationSlug/p/:projectSlug/issues/:issueCode"
      />
    </Routes>,
    { route: "/w/acme/p/apollo/issues/I-0001" },
  );
}

async function settle(paragraphs: string) {
  await waitFor(() => {
    expect(screen.getByTestId("paragraphs")).toHaveTextContent(paragraphs);
    expect(screen.getByTestId("generation")).toHaveTextContent("1");
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  expect(screen.getByTestId("generation")).toHaveTextContent("1");
  expect(screen.getByTestId("paragraphs")).toHaveTextContent(paragraphs);
}

beforeEach(() => {
  sessionStorage.clear();
  useWorkspaceHandlers();
});

test("does not remount the editor when autosave is acknowledged ahead of the cache", async () => {
  const patches: unknown[] = [];
  const issueServer: IssueServer = {
    holdFirst: false,
    lag: true,
    mode: "ok",
    release: null,
    snapshot: issueFixture(notes),
    stored: issueFixture(notes),
  };

  installIssueServer(issueServer, patches);
  renderDetail();

  expect(await screen.findByTestId("paragraphs")).toHaveTextContent("1");
  expect(screen.getByTestId("generation")).toHaveTextContent("1");

  await userEvent.click(screen.getByRole("button", { name: "Add blank lines" }));

  await waitFor(() => {
    expect(patches).toHaveLength(1);
  });
  await settle("5");
  expect(screen.getByTestId("save")).toHaveTextContent("Saved");
  expect(patches[0]).toMatchObject({
    content: blankLines,
    expectedUpdatedAt: initialUpdatedAt,
    title: "Gate",
  });
});

test("keeps a later edit across a slow save and a stale refetch", async () => {
  const patches: { content?: IssueContentDocument | null; expectedUpdatedAt?: string }[] = [];
  const issueServer: IssueServer = {
    holdFirst: true,
    lag: true,
    mode: "ok",
    release: null,
    snapshot: issueFixture(notes),
    stored: issueFixture(notes),
  };

  installIssueServer(issueServer, patches);
  renderDetail();
  await screen.findByTestId("generation");
  await userEvent.click(screen.getByRole("button", { name: "Add blank lines" }));

  await waitFor(() => {
    expect(patches).toHaveLength(1);
  });

  await userEvent.click(screen.getByRole("button", { name: "Type again" }));
  issueServer.release?.();

  await waitFor(() => {
    expect(patches).toHaveLength(2);
  });
  await settle("6");
  expect(screen.getByTestId("save").textContent).not.toContain("somewhere else");
  expect(patches[1]?.content).toEqual(laterEdit);
  expect(patches[1]?.expectedUpdatedAt).not.toBe(initialUpdatedAt);
});

test("keeps blank lines when the server normalizes the acknowledgement", async () => {
  const patches: { content?: IssueContentDocument | null }[] = [];
  const issueServer: IssueServer = {
    holdFirst: false,
    lag: false,
    mode: "strip",
    release: null,
    snapshot: issueFixture(notes),
    stored: issueFixture(notes),
  };

  installIssueServer(issueServer, patches);
  renderDetail();
  await screen.findByTestId("generation");
  await userEvent.click(screen.getByRole("button", { name: "Add blank lines" }));
  await waitFor(() => {
    expect(patches).toHaveLength(1);
    expect(screen.getByTestId("save")).toHaveTextContent("Saved");
  });
  await settle("5");

  await userEvent.click(screen.getByRole("button", { name: "Type again" }));
  await waitFor(() => {
    expect(patches).toHaveLength(2);
  });
  expect(patches[1]?.content).toEqual(laterEdit);
  await settle("6");
});

test("keeps an enter in an empty document when the cache is still empty", async () => {
  const patches: unknown[] = [];
  const issueServer: IssueServer = {
    holdFirst: false,
    lag: true,
    mode: "ok",
    release: null,
    snapshot: issueFixture(null),
    stored: issueFixture(null),
  };

  installIssueServer(issueServer, patches);
  renderDetail();

  expect(await screen.findByTestId("paragraphs")).toHaveTextContent("0");
  await userEvent.click(screen.getByRole("button", { name: "Enter on empty" }));
  await waitFor(() => {
    expect(patches).toHaveLength(1);
  });
  await settle("2");
  expect(patches[0]).toMatchObject({ content: emptyEnter });
});

test("retries a later edit after a failed save without resetting the editor", async () => {
  const patches: { content?: IssueContentDocument | null }[] = [];
  const issueServer: IssueServer = {
    holdFirst: false,
    lag: true,
    mode: "error",
    release: null,
    snapshot: issueFixture(notes),
    stored: issueFixture(notes),
  };

  installIssueServer(issueServer, patches);
  renderDetail();
  await screen.findByTestId("generation");
  await userEvent.click(screen.getByRole("button", { name: "Add blank lines" }));

  await waitFor(() => {
    expect(screen.getByTestId("save")).toHaveTextContent("could not be saved");
  });
  await settle("5");

  issueServer.mode = "ok";
  await userEvent.click(screen.getByRole("button", { name: "Type again" }));
  await waitFor(() => {
    expect(patches).toHaveLength(2);
  });
  await settle("6");
  expect(patches[1]?.content).toEqual(laterEdit);
});

test("keeps the draft through a conflict and a reload", async () => {
  const patches: unknown[] = [];
  const issueServer: IssueServer = {
    holdFirst: false,
    lag: true,
    mode: "conflict",
    release: null,
    snapshot: issueFixture(notes),
    stored: issueFixture(notes),
  };

  installIssueServer(issueServer, patches);
  const first = renderDetail();

  await screen.findByTestId("generation");
  await userEvent.click(screen.getByRole("button", { name: "Add blank lines" }));
  await waitFor(() => {
    expect(screen.getByTestId("save")).toHaveTextContent("somewhere else");
  });
  await settle("5");
  expect(sessionStorage.getItem(`teamos:issue-draft:${issueId}`)).toContain("Hello");

  first.unmount();
  renderDetail();

  expect(await screen.findByTestId("paragraphs")).toHaveTextContent("5");
  expect(screen.getByTestId("generation")).toHaveTextContent("1");
});

test("restores stored blank lines after a reload", async () => {
  const patches: unknown[] = [];
  const issueServer: IssueServer = {
    holdFirst: false,
    lag: false,
    mode: "ok",
    release: null,
    snapshot: issueFixture(notes),
    stored: issueFixture(notes),
  };

  installIssueServer(issueServer, patches);
  const first = renderDetail();

  await screen.findByTestId("generation");
  await userEvent.click(screen.getByRole("button", { name: "Add blank lines" }));
  await waitFor(() => {
    expect(screen.getByTestId("save")).toHaveTextContent("Saved");
  });
  await settle("5");
  expect(sessionStorage.getItem(`teamos:issue-draft:${issueId}`)).toBeNull();

  first.unmount();
  renderDetail();

  expect(await screen.findByTestId("paragraphs")).toHaveTextContent("5");
});

test("does not write content for a selection-only update", async () => {
  const patches: unknown[] = [];
  const issueServer: IssueServer = {
    holdFirst: false,
    lag: false,
    mode: "ok",
    release: null,
    snapshot: issueFixture(notes),
    stored: issueFixture(notes),
  };

  installIssueServer(issueServer, patches);
  renderDetail();
  await screen.findByTestId("generation");
  await userEvent.click(screen.getByRole("button", { name: "Move caret" }));

  expect(screen.getByTestId("copy")).toHaveTextContent("1");
  expect(screen.getByTestId("dirty")).toHaveTextContent("clean");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
  expect(patches).toEqual([]);
  expect(screen.getByTestId("generation")).toHaveTextContent("1");
});
