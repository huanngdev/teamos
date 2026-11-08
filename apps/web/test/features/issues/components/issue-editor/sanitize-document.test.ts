import { expect, test } from "vitest";

import { sanitizeIssueEditorState } from "./sanitize-document";

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
    format: "",
    indent: 0,
    type: "paragraph" as const,
    version: 1 as const,
  };
}

function editorState(children: readonly Record<string, unknown>[]) {
  return {
    root: {
      children,
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
}

test("keeps an enter at the end, in the middle, and several blank lines", () => {
  const sanitized = sanitizeIssueEditorState(
    editorState([
      paragraph("Hello"),
      paragraph(""),
      paragraph(""),
      paragraph("World"),
      paragraph(""),
    ]),
  );

  expect(sanitized.error).toBeNull();
  expect(sanitized.content?.root.children).toHaveLength(5);
  expect(sanitized.content?.root.children.map((node) => node.type)).toEqual([
    "paragraph",
    "paragraph",
    "paragraph",
    "paragraph",
    "paragraph",
  ]);
});

test("keeps a shift-enter linebreak inside a paragraph", () => {
  const sanitized = sanitizeIssueEditorState(
    editorState([
      {
        children: [text("Hello"), { type: "linebreak", version: 1 }, text("there")],
        direction: null,
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ]),
  );
  const paragraphNode = sanitized.content?.root.children[0];

  expect(sanitized.error).toBeNull();
  expect(paragraphNode?.type).toBe("paragraph");

  if (paragraphNode?.type !== "paragraph") {
    return;
  }

  expect(paragraphNode.children.map((node) => node.type)).toEqual(["text", "linebreak", "text"]);
});

test("keeps an empty list item between items", () => {
  const item = (value: string) => ({
    children: [paragraph(value)],
    direction: null,
    format: "",
    indent: 0,
    type: "listitem" as const,
    value: 1,
    version: 1 as const,
  });
  const sanitized = sanitizeIssueEditorState(
    editorState([
      {
        children: [item("One"), item("")],
        direction: null,
        format: "",
        indent: 0,
        listType: "bullet",
        start: 1,
        tag: "ul",
        type: "list",
        version: 1,
      },
    ]),
  );
  const list = sanitized.content?.root.children[0];

  expect(sanitized.error).toBeNull();
  expect(list?.type).toBe("list");

  if (list?.type !== "list") {
    return;
  }

  expect(list.children).toHaveLength(2);
});
