import { $isListNode } from "@lexical/list";
import { $isHeadingNode } from "@lexical/rich-text";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { issueContentFromPlainText } from "@teamos/shared";
import {
  $addUpdateTag,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  getNearestEditorFromDOMNode,
  type LexicalEditor,
} from "lexical";
import { afterEach, expect, test } from "vitest";

import { IssueEditor } from "./issue-editor";

const caret = {
  bottom: 40,
  height: 16,
  left: 12,
  right: 12,
  toJSON() {
    return {};
  },
  top: 24,
  width: 0,
  x: 12,
  y: 24,
};

let restoreCaret = () => undefined as void;

afterEach(() => {
  restoreCaret();
});

function installCaret(box: { height: number; width: number } | null) {
  const original = Range.prototype.getBoundingClientRect;

  Range.prototype.getBoundingClientRect = () =>
    (box === null
      ? { ...caret, bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0 }
      : { ...caret, ...box }) as DOMRect;

  restoreCaret = () => {
    Range.prototype.getBoundingClientRect = original;
  };
}

function renderEditor() {
  installCaret({ height: 16, width: 0 });
  render(<IssueEditor document={null} editable generation={0} onChange={() => undefined} />);
  return editorFromDom();
}

function editorFromDom() {
  const editor = getNearestEditorFromDOMNode(
    screen.getByRole("textbox", { name: "Issue content" }),
  );

  if (editor === null) {
    throw new Error("missing editor");
  }

  return editor;
}

function place(editor: LexicalEditor, text: string, offset = text.length) {
  editor.update(() => {
    const root = $getRoot();
    root.clear();
    const paragraph = $createParagraphNode();
    const node = $createTextNode(text);
    paragraph.append(node);
    root.append(paragraph);
    node.select(offset, offset);
  });
}

async function typeSlash(editor: LexicalEditor, text: string) {
  await act(async () => {
    place(editor, text);
  });
}

function blockOf(editor: LexicalEditor) {
  let tag = "";
  let text = "";
  let type = "";

  editor.getEditorState().read(() => {
    const node = $getRoot().getFirstChild();
    text = $getRoot().getTextContent();
    type = node?.getType() ?? "";

    if (node !== null && $isHeadingNode(node)) {
      tag = node.getTag();
    } else if (node !== null && $isListNode(node)) {
      tag = node.getListType();
    }
  });

  return { tag, text, type };
}

function menu() {
  return screen.queryByRole("listbox", { name: "Insert" });
}

function optionNames() {
  const list = menu();

  if (list === null) {
    return [];
  }

  return [...list.querySelectorAll("[role=option]")].map((option) => option.textContent);
}

test("opens the insert menu for a slash in an empty paragraph, after a space, and in a new paragraph", async () => {
  const editor = renderEditor();

  await typeSlash(editor, "/");

  expect(optionNames()).toEqual([
    "Text",
    "Heading 1",
    "Heading 2",
    "Heading 3",
    "Bulleted list",
    "Numbered list",
    "Checklist",
    "Quote",
    "Code block",
    "TableUnavailable",
    "ImageUnavailable",
    "FileUnavailable",
  ]);
  expect(menu()?.style.getPropertyValue("--issue-menu-left")).toBe("12px");
  expect(menu()?.style.getPropertyValue("--issue-menu-top")).toBe("44px");

  await typeSlash(editor, "hello /");

  expect(menu()).not.toBeNull();
  expect(blockOf(editor).text).toBe("hello /");

  await act(async () => {
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      const first = $createParagraphNode();
      first.append($createTextNode("kept"));
      const second = $createParagraphNode();
      const slash = $createTextNode("/");
      second.append(slash);
      root.append(first, second);
      slash.select(1, 1);
    });
  });

  expect(menu()).not.toBeNull();
  expect(blockOf(editor).text).toBe("kept\n\n/");
});

test("opens the menu when the caret is an element point or has no geometry", async () => {
  const editor = renderEditor();

  await act(async () => {
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      const node = $createTextNode("/");
      paragraph.append(node);
      root.append(paragraph);
      const selection = node.select(1, 1);
      selection.anchor.set(paragraph.getKey(), 1, "element");
      selection.focus.set(paragraph.getKey(), 1, "element");
      $addUpdateTag(SKIP_DOM_SELECTION_TAG);
    });
  });

  let anchorType = "";
  editor.getEditorState().read(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      anchorType = selection.anchor.type;
    }
  });

  expect(anchorType).toBe("element");
  expect(menu()).not.toBeNull();
  expect(optionNames()).toContain("Text");

  restoreCaret();
  installCaret(null);

  await typeSlash(editor, "/");

  expect(menu()).not.toBeNull();
  expect(blockOf(editor).text).toBe("/");
});

test("filters commands and keeps a visible no-results state", async () => {
  const editor = renderEditor();

  await typeSlash(editor, "/h2");

  expect(optionNames()).toEqual(["Heading 2"]);

  await typeSlash(editor, "/zzzz");

  expect(menu()).not.toBeNull();
  expect(screen.getByText("No results")).toBeInTheDocument();
  expect(blockOf(editor).text).toBe("/zzzz");
});

test("chooses a command from the keyboard and leaves a failed key alone", async () => {
  const editor = renderEditor();

  await typeSlash(editor, "say /h2");
  await act(async () => {
    editor.dispatchCommand(KEY_ENTER_COMMAND, new KeyboardEvent("keydown", { key: "Enter" }));
  });

  expect(blockOf(editor)).toEqual({ tag: "h2", text: "say ", type: "heading" });
  expect(menu()).toBeNull();

  await typeSlash(editor, "/");
  await act(async () => {
    editor.dispatchCommand(
      KEY_ARROW_DOWN_COMMAND,
      new KeyboardEvent("keydown", { key: "ArrowDown" }),
    );
  });
  await act(async () => {
    editor.dispatchCommand(KEY_ENTER_COMMAND, new KeyboardEvent("keydown", { key: "Enter" }));
  });

  expect(blockOf(editor)).toEqual({ tag: "h1", text: "", type: "heading" });

  await typeSlash(editor, "/table");
  await act(async () => {
    editor.dispatchCommand(KEY_ENTER_COMMAND, new KeyboardEvent("keydown", { key: "Enter" }));
  });

  expect(blockOf(editor)).toMatchObject({ text: "/table", type: "paragraph" });
  expect(screen.getByRole("option", { name: "Table Unavailable" })).toBeDisabled();
});

test("runs a command from a click or a touch and ignores a disabled command", async () => {
  const editor = renderEditor();

  await typeSlash(editor, "/");
  fireEvent.click(screen.getByRole("option", { name: "Quote" }));

  expect(blockOf(editor)).toEqual({ tag: "", text: "", type: "quote" });

  await typeSlash(editor, "/");
  const checklist = screen.getByRole("option", { name: "Checklist" });
  fireEvent.pointerUp(checklist, { pointerType: "touch" });
  fireEvent.click(checklist);

  expect(blockOf(editor)).toEqual({ tag: "check", text: "", type: "list" });

  await typeSlash(editor, "/image");
  fireEvent.click(screen.getByRole("option", { name: "Image Unavailable" }));
  fireEvent.pointerUp(screen.getByRole("option", { name: "Image Unavailable" }), {
    pointerType: "touch",
  });

  expect(blockOf(editor)).toMatchObject({ text: "/image", type: "paragraph" });
});

test("dismisses with Escape without deleting typed text and does not steal IME", async () => {
  const editor = renderEditor();

  await typeSlash(editor, "say /");
  await act(async () => {
    editor.dispatchCommand(KEY_ESCAPE_COMMAND, new KeyboardEvent("keydown", { key: "Escape" }));
  });

  expect(menu()).toBeNull();
  expect(blockOf(editor).text).toBe("say /");

  await act(async () => {
    editor.update(() => {
      const paragraph = $getRoot().getFirstChild();
      const text =
        paragraph !== null && $isElementNode(paragraph) ? paragraph.getFirstChild() : null;

      if ($isTextNode(text)) {
        text.spliceText(text.getTextContentSize(), 0, "x");
        text.select(text.getTextContentSize(), text.getTextContentSize());
      }
    });
  });

  expect(menu()).toBeNull();
  expect(blockOf(editor).text).toBe("say /x");

  await typeSlash(editor, "next /");

  expect(menu()).not.toBeNull();

  await typeSlash(editor, "/");
  const composing = new KeyboardEvent("keydown", { key: "Enter" });
  Object.defineProperty(composing, "keyCode", { value: 229 });
  await act(async () => {
    editor.dispatchCommand(KEY_ENTER_COMMAND, composing);
  });

  expect(blockOf(editor)).toMatchObject({ text: "/", type: "paragraph" });
  expect(menu()).not.toBeNull();
});

test("opens again after the editor reloads a stored slash", async () => {
  installCaret({ height: 16, width: 0 });
  const document = issueContentFromPlainText("/");

  if (document === null) {
    throw new Error("expected a slash document");
  }

  const view = render(
    <IssueEditor document={null} editable generation={0} onChange={() => undefined} />,
  );
  const editor = editorFromDom();

  view.rerender(
    <IssueEditor document={document} editable generation={1} onChange={() => undefined} />,
  );
  await act(async () => {
    editor.update(() => {
      const paragraph = $getRoot().getFirstChild();
      const text =
        paragraph !== null && $isElementNode(paragraph) ? paragraph.getFirstChild() : null;

      if ($isTextNode(text)) {
        text.select(1, 1);
      }
    });
  });

  expect(menu()).not.toBeNull();
  expect(optionNames()[0]).toBe("Text");
});

test("does not open for a slash inside a word", async () => {
  const editor = renderEditor();

  await typeSlash(editor, "path/name");

  expect(menu()).toBeNull();
});
