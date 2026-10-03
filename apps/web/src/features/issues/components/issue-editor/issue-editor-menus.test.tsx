import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { issueContentFromPlainText } from "@teamos/shared";
import { afterEach, expect, test } from "vitest";

import { IssueEditor } from "./issue-editor";

const originalRect = Range.prototype.getBoundingClientRect;

function sizedRect(width: number, height: number): DOMRect {
  return {
    bottom: 80 + height,
    height,
    left: 80,
    right: 80 + width,
    toJSON() {
      return {};
    },
    top: 80,
    width,
    x: 80,
    y: 80,
  } as DOMRect;
}

function installSelectionRects() {
  Range.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const text = this.toString();

    // A collapsed caret still has height. A zero rect hides every menu.
    return text.length > 0 ? sizedRect(text.length * 8, 20) : sizedRect(0, 16);
  };
}

afterEach(() => {
  Range.prototype.getBoundingClientRect = originalRect;
});

async function selectEditorText() {
  installSelectionRects();
  const document = issueContentFromPlainText("Hello team");

  if (document === null) {
    throw new Error("expected a document");
  }

  render(<IssueEditor document={document} editable generation={1} onChange={() => undefined} />);

  const editable = await screen.findByLabelText("Issue content");
  const text = editable.querySelector("span")?.firstChild;

  if (text === null || text === undefined || text.nodeType !== Node.TEXT_NODE) {
    throw new Error(`missing text node: ${editable.innerHTML}`);
  }

  editable.focus();
  const range = window.document.createRange();
  range.setStart(text, 0);
  range.setEnd(text, text.textContent?.length ?? 0);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  window.document.dispatchEvent(new Event("selectionchange"));
  await screen.findByRole("button", { name: "Bold" });
}

function formatToolbar(): HTMLElement {
  const menu = screen.getByRole("button", { name: "Bold" }).parentElement;

  if (menu === null) {
    throw new Error("missing format toolbar");
  }

  return menu;
}

test("keeps the format toolbar open when a selection drag releases on it", async () => {
  const user = userEvent.setup();
  await selectEditorText();
  const menu = formatToolbar();

  fireEvent.mouseDown(window.document, { button: 0, buttons: 1, clientX: 0, clientY: 0 });
  fireEvent.mouseMove(window.document, { buttons: 1, clientX: 0, clientY: 0 });

  const selection = window.getSelection();
  selection?.removeAllRanges();
  window.document.dispatchEvent(new Event("selectionchange"));

  expect(selection?.toString()).toBe("Hello team");
  expect(menu).toBeInTheDocument();

  fireEvent.mouseUp(window.document, { clientX: 0, clientY: 0 });

  await user.click(screen.getByRole("button", { name: "Bold" }));
  await user.click(screen.getByRole("button", { name: "Italic" }));
  await user.click(screen.getByRole("button", { name: "Inline code" }));

  expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Italic" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Inline code" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Link" }));

  expect(screen.getByRole("textbox", { name: "Link address" })).toBeInTheDocument();
});

test("escape dismisses the format toolbar", async () => {
  await selectEditorText();
  fireEvent.keyDown(screen.getByLabelText("Issue content"), { key: "Escape" });

  await waitFor(() => {
    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
  });
});

test("the bold keyboard shortcut still formats the selection", async () => {
  await selectEditorText();
  const apple = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  fireEvent.keyDown(screen.getByLabelText("Issue content"), {
    ctrlKey: !apple,
    key: "b",
    metaKey: apple,
  });

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
  });
});

test("escape still closes the slash menu", async () => {
  const user = userEvent.setup();
  installSelectionRects();
  const document = issueContentFromPlainText("Hello team");

  if (document === null) {
    throw new Error("expected a document");
  }

  render(<IssueEditor document={document} editable generation={1} onChange={() => undefined} />);
  const editable = await screen.findByLabelText("Issue content");
  await user.click(editable);
  await user.keyboard("/");

  expect(await screen.findByRole("listbox", { name: "Insert" })).toBeInTheDocument();
  fireEvent.keyDown(editable, { key: "Escape" });

  await waitFor(() => {
    expect(screen.queryByRole("listbox", { name: "Insert" })).not.toBeInTheDocument();
  });
});

test("escape from the link field dismisses the format toolbar", async () => {
  const user = userEvent.setup();
  await selectEditorText();
  await user.click(screen.getByRole("button", { name: "Link" }));
  fireEvent.keyDown(await screen.findByRole("textbox", { name: "Link address" }), {
    key: "Escape",
  });

  await waitFor(() => {
    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
  });
});

test("a click outside the editor dismisses the format toolbar", async () => {
  await selectEditorText();
  fireEvent.mouseDown(window.document, { button: 0, buttons: 1, clientX: 400, clientY: 400 });

  await waitFor(() => {
    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
  });
  expect(window.getSelection()?.toString() ?? "").toBe("");
});
